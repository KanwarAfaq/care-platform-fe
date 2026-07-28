import os
import urllib.parse
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

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
                user_text = event.message.text
                
                # Check for relevant keywords
                if "日照" in user_text or "長照" in user_text or "推薦" in user_text:
                    
                    # Fetch up to 5 centers from Supabase to populate the Carousel
                    response = supabase.table('care_centers').select('*').limit(5).execute()
                    centers = response.data
                    
                    if centers:
                        bubbles = []
                        
                        for center in centers:
                            name = center.get("name", "Unknown")
                            address = center.get("address", "")
                            phone = str(center.get("phone", "")).strip()
                            capacity = center.get("capacity", 0)

                            # 1. Safely encode the address (fallback to Taoyuan if empty)
                            safe_address = address if address else "桃園市"
                            encoded_address = urllib.parse.quote(safe_address)
                            map_url = f"https://www.google.com/maps/search/?api=1&query={encoded_address}"

                            # 2. Safely encode the phone (fallback to a dummy number if empty to prevent LINE crash)
                            safe_phone = phone.replace(" ", "").replace("(", "").replace(")", "")
                            if not safe_phone:
                                safe_phone = "00000000" # Safe fallback
                            phone_url = f"tel:{safe_phone}"
                            
                            # Build the visual card (Bubble) for each center
                            bubble = {
                                "type": "bubble",
                                "size": "mega",
                                "body": {
                                    "type": "box",
                                    "layout": "vertical",
                                    "spacing": "sm",
                                    "contents": [
                                        {
                                            "type": "text",
                                            "text": name,
                                            "weight": "bold",
                                            "size": "lg",
                                            "wrap": True,
                                            "color": "#111827"
                                        },
                                        {
                                            "type": "text",
                                            "text": f"📍 {address}",
                                            "size": "sm",
                                            "color": "#6B7280",
                                            "wrap": True,
                                            "margin": "md"
                                        },
                                        {
                                            "type": "text",
                                            "text": f"🛏️ 核定容量 (床位/人數): {capacity}",
                                            "size": "sm",
                                            "color": "#2563EB",
                                            "weight": "bold",
                                            "margin": "sm"
                                        }
                                    ]
                                },
                                "footer": {
                                    "type": "box",
                                    "layout": "horizontal",
                                    "spacing": "sm",
                                    "contents": [
                                        {
                                            "type": "button",
                                            "style": "primary",
                                            "color": "#2563EB",
                                            "height": "sm",
                                            "action": {
                                                "type": "uri",
                                                "label": "打電話",
                                                "uri": phone_url
                                            }
                                        },
                                        {
                                            "type": "button",
                                            "style": "secondary",
                                            "height": "sm",
                                            "action": {
                                                "type": "uri",
                                                "label": "看地圖",
                                                "uri": map_url
                                            }
                                        }
                                    ]
                                }
                            }
                            bubbles.append(bubble)
                        
                        # Wrap all the bubbles in a Carousel and create the FlexSendMessage
                        reply_message = FlexSendMessage(
                            alt_text="為您推薦的照護機構",
                            contents={
                                "type": "carousel",
                                "contents": bubbles
                            }
                        )
                        line_bot_api.reply_message(event.reply_token, reply_message)
                        
                    else:
                        # Fallback if the database returns empty
                        line_bot_api.reply_message(
                            event.reply_token,
                            TextSendMessage(text="目前資料庫中沒有找到相關資料。")
                        )
                else:
                    # Default greeting
                    line_bot_api.reply_message(
                        event.reply_token,
                        TextSendMessage(text="您好！我是桃園長照導航站。請輸入您的需求（例如：「推薦日照中心」），我會為您尋找適合的機構。")
                    )
                    
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print(f"Error processing message: {e}")

    return 'OK'