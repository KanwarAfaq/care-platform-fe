import os
import urllib.parse
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from sync_gov_data import fetch_and_sync_data
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage, FlexSendMessage

# Load environment variables
load_dotenv()

# Initialize Supabase Client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize LINE Bot API
line_bot_api = LineBotApi(os.environ.get("LINE_CHANNEL_ACCESS_TOKEN"))
handler = WebhookHandler(os.environ.get("LINE_CHANNEL_SECRET"))

# Initialize FastAPI
app = FastAPI()

# Configure CORS for Frontend Integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to ["https://care-platform-fe.vercel.app"] for production security
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserProfile(BaseModel):
    cms_level: int
    income_status: str

@app.get("/")
@app.get("/api")
def read_root():
    return {"status": "Taoyuan Care Platform Backend is running!"}

def get_care_center_flex_message(search_term: str):
    """Searches Supabase by District or Name and returns a LINE Flex Message Carousel."""
    
    # 1. Search Supabase by district first (limit to 10 for LINE carousel max limit)
    response = supabase.table("care_centers") \
        .select("*") \
        .ilike("district", f"%{search_term}%") \
        .limit(10) \
        .execute()
    
    # 2. If no district matches, search by facility name or general keywords
    if not response.data:
        response = supabase.table("care_centers") \
            .select("*") \
            .ilike("name", f"%{search_term}%") \
            .limit(10) \
            .execute()
            
    # 3. If STILL no results found, return a helpful text prompt
    if not response.data:
        return TextSendMessage(
            text=f"找不到與「{search_term}」相關的長照機構 😢\n\n請嘗試輸入：\n1. 行政區名稱 (例如：八德區, 中壢區, 桃園區)\n2. 機構關鍵字 (例如：日照, 佳緣)"
        )
        
    # 4. Build the Flex Message Carousel
    bubbles = []
    for center in response.data:
        # 1. Null-safe string extraction
        name = center.get("name") or "未命名機構"
        district = center.get("district") or "桃園市"
        address = center.get("address") or "桃園市"
        
        # 2. Null-safe capacity extraction (prevents Python crash)
        raw_capacity = center.get("capacity")
        try:
            capacity = int(raw_capacity) if raw_capacity is not None else 0
        except (ValueError, TypeError):
            capacity = 0
            
        capacity_text = f"🛏️ 核定床位/容量: {capacity}" if capacity > 0 else "🛏️ 核定床位/容量: 依官方公告"

        # 3. Null-safe phone extraction (prevents LINE API rejection)
        phone_raw = str(center.get("phone") or "")
        clean_phone = phone_raw.replace(" ", "").replace("(", "").replace(")", "").replace("-", "")
        # Only allow the tel: link if there are actually numbers
        phone_url = f"tel:{clean_phone}" if clean_phone and clean_phone.isdigit() else "tel:033322101" 

        # 4. Safe map URL
        map_query = urllib.parse.quote(f"{name} {address}")
        map_url = f"https://www.google.com/maps/search/?api=1&query={map_query}"

        bubble = {
            "type": "bubble",
            "size": "micro",
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": district,
                        "color": "#1DB446",
                        "size": "xs",
                        "weight": "bold"
                    },
                    {
                        "type": "text",
                        "text": name,
                        "weight": "bold",
                        "size": "sm",
                        "margin": "md",
                        "wrap": True,
                        "maxLines": 2
                    },
                    {
                        "type": "text",
                        "text": f"📍 {address}",
                        "size": "xxs",
                        "color": "#888888",
                        "margin": "md",
                        "wrap": True
                    },
                    {
                        "type": "text",
                        "text": capacity_text,
                        "size": "xxs",
                        "color": "#2563EB",
                        "weight": "bold",
                        "margin": "sm"
                    }
                ]
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "button",
                        "style": "primary",
                        "color": "#2563EB",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "📞 撥打電話",
                            "uri": phone_url
                        }
                    },
                    {
                        "type": "button",
                        "style": "secondary",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "🗺️ 地圖導航",
                            "uri": map_url
                        }
                    }
                ]
            }
        }
    bubbles.append(bubble)
    # Wrap all bubbles in a Carousel
    carousel = {
        "type": "carousel",
        "contents": bubbles
    }
    
    return FlexSendMessage(alt_text=f"為您找到 {len(response.data)} 間機構", contents=carousel)

# --- Subsidy Calculation Endpoint ---
@app.post("/api/calculate-subsidy")
def calculate_subsidy(profile: UserProfile):
    care_caps = {2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180}
    copay_rates = {"general": 0.16, "mid_low": 0.05, "low": 0.0}
    care_cap = care_caps.get(profile.cms_level, 0)
    rate = copay_rates.get(profile.income_status, 0.16)
    government_pays = care_cap * (1 - rate)
    user_pays = care_cap * rate
    return {
        "monthly_care_cap": care_cap,
        "government_subsidy": round(government_pays),
        "user_copay": round(user_pays)
    }

# --- Serverless-Optimized LINE Webhook Endpoint ---
@app.post("/api/webhook")
async def callback(request: Request):
    signature = request.headers.get('X-Line-Signature')
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    body = await request.body()
    body_str = body.decode('utf-8')

    try:
        events = handler.parser.parse(body_str, signature)
        
        for event in events:
            if isinstance(event, MessageEvent) and isinstance(event.message, TextMessage):
                user_text = event.message.text.strip()
                
                # Check for explicit greetings
                if user_text.lower() in ["hi", "hello", "你好", "您好", "選單", "幫助"]:
                    reply_message = TextSendMessage(
                        text="您好！我是桃園長照導航站 👵👴\n\n您可以直接輸入：\n1. 行政區 (例如：八德區, 中壢區, 桃園區)\n2. 機構名稱 (例如：旭登, 佳緣)\n3. 服務關鍵字 (例如：日照, 長照)\n\n我會即時為您查詢並回傳機構卡片！"
                    )
                else:
                    # Dynamically search Supabase for districts, names, or care keywords
                    reply_message = get_care_center_flex_message(user_text)
                
                line_bot_api.reply_message(event.reply_token, reply_message)
                    
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print(f"Error processing message: {e}")

    return 'OK'

@app.get("/api/sync-government-data")
def trigger_sync(token: str = Query(None)):
    expected_token = os.environ.get("CRON_SECRET")
    
    if not expected_token or token != expected_token:
        raise HTTPException(status_code=401, detail="Unauthorized request")
    
    try:
        fetch_and_sync_data()
        return {"message": "Database sync successful!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))