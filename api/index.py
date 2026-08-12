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
from linebot.models import MessageEvent, TextMessage, TextSendMessage, FlexSendMessage, PostbackEvent

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# ==========================================
# 1. DYNAMIC CARE CENTER SEARCH FUNCTIONS
# ==========================================

def get_district_select_flex_message():
    """Fetches unique districts dynamically from Supabase and returns an interactive Flex Message grid."""
    db_response = supabase.table("care_centers").select("district").execute()
    
    # Extract unique, non-empty districts directly from Supabase
    unique_districts = sorted(list({
        item["district"].strip() 
        for item in db_response.data 
        if item.get("district") and item.get("district").strip()
    }))
    
    rows = []
    current_row = []
    
    for district in unique_districts:
        current_row.append({
            "type": "button", "style": "secondary", "height": "sm", "margin": "xs",
            "action": {"type": "message", "label": district, "text": district}
        })
        if len(current_row) == 3:
            rows.append({"type": "box", "layout": "horizontal", "spacing": "xs", "contents": current_row})
            current_row = []
            
    if current_row:
        rows.append({"type": "box", "layout": "horizontal", "spacing": "xs", "contents": current_row})
        
    return FlexSendMessage(alt_text="請選擇行政區", contents={
        "type": "bubble",
        "header": {
            "type": "box", "layout": "vertical", "contents": [
                {"type": "text", "text": "🔍 請選擇行政區", "weight": "bold", "size": "lg", "color": "#2563EB"},
                {"type": "text", "text": "點擊下方按鈕即可快速搜尋：", "size": "xs", "color": "#6B7280", "margin": "xs"}
            ]
        },
        "body": {"type": "box", "layout": "vertical", "spacing": "xs", "contents": rows}
    })

def get_care_center_flex_message(search_term: str):
    """Searches Supabase by District or Name and returns a LINE Flex Message Carousel."""
    response = supabase.table("care_centers").select("*").ilike("district", f"%{search_term}%").limit(10).execute()
    
    if not response.data:
        response = supabase.table("care_centers").select("*").ilike("name", f"%{search_term}%").limit(10).execute()
            
    if not response.data:
        return TextSendMessage(text=f"找不到與「{search_term}」相關的長照機構 😢\n請嘗試輸入其他行政區或關鍵字。")
        
    bubbles = []
    for center in response.data:
        name = center.get("name") or "未命名機構"
        district = center.get("district") or "桃園市"
        address = center.get("address") or "桃園市"
        
        raw_capacity = center.get("capacity")
        try:
            capacity = int(raw_capacity) if raw_capacity is not None else 0
        except (ValueError, TypeError):
            capacity = 0
            
        capacity_text = f"🛏️ 核準床位: {capacity}" if capacity > 0 else "🛏️ 核準床位: 依官方公告"

        phone_raw = str(center.get("phone") or "")
        clean_phone = phone_raw.replace(" ", "").replace("(", "").replace(")", "").replace("-", "")
        phone_url = f"tel:{clean_phone}" if clean_phone and clean_phone.isdigit() else "tel:033322101" 

        map_query = urllib.parse.quote(f"{name} {address}")
        map_url = f"https://www.google.com/maps/search/?api=1&query={map_query}"

        bubble = {
            "type": "bubble", "size": "micro",
            "body": {
                "type": "box", "layout": "vertical", "contents": [
                    {"type": "text", "text": district, "color": "#1DB446", "size": "xs", "weight": "bold"},
                    {"type": "text", "text": name, "weight": "bold", "size": "sm", "margin": "md", "wrap": True, "maxLines": 2},
                    {"type": "text", "text": f"📍 {address}", "size": "xxs", "color": "#888888", "margin": "md", "wrap": True},
                    {"type": "text", "text": capacity_text, "size": "xxs", "color": "#2563EB", "weight": "bold", "margin": "sm"}
                ]
            },
            "footer": {
                "type": "box", "layout": "vertical", "spacing": "sm", "contents": [
                    {"type": "button", "style": "primary", "color": "#2563EB", "height": "sm", "action": {"type": "uri", "label": "📞 撥打電話", "uri": phone_url}},
                    {"type": "button", "style": "secondary", "height": "sm", "action": {"type": "uri", "label": "🗺️ 地圖導航", "uri": map_url}}
                ]
            }
        }
        bubbles.append(bubble)
        
    return FlexSendMessage(alt_text=f"為您找到 {len(response.data)} 間機構", contents={"type": "carousel", "contents": bubbles})


# ==========================================
# 2. MULTI-STEP CALCULATOR FUNCTIONS
# ==========================================

def get_calc_district_flex():
    """Step 1: Calculator District Selection (Uses Postback data)"""
    taoyuan_districts = ["八德區", "中壢區", "桃園區", "平鎮區", "楊梅區", "蘆竹區", "龜山區", "龍潭區", "大溪區", "大園區", "觀音區", "新屋區", "復興區"]
    rows = []
    current_row = []
    for d in taoyuan_districts:
        current_row.append({
            "type": "button", "style": "secondary", "height": "sm", "margin": "xs",
            "action": {"type": "postback", "label": d, "data": f"calc_step1_{d}", "displayText": f"選擇區域：{d}"}
        })
        if len(current_row) == 3:
            rows.append({"type": "box", "layout": "horizontal", "spacing": "xs", "contents": current_row})
            current_row = []
    if current_row:
        rows.append({"type": "box", "layout": "horizontal", "spacing": "xs", "contents": current_row})

    return FlexSendMessage(alt_text="試算: 選擇行政區", contents={
        "type": "bubble",
        "header": {"type": "box", "layout": "vertical", "contents": [
            {"type": "text", "text": "💰 補助試算 (1/3)", "weight": "bold", "size": "lg", "color": "#1DB446"},
            {"type": "text", "text": "請問您位於哪個行政區？", "size": "sm", "color": "#6B7280"}
        ]},
        "body": {"type": "box", "layout": "vertical", "spacing": "xs", "contents": rows}
    })

def get_calc_cms_flex(district):
    """Step 2: CMS Level Selection"""
    levels = [2, 3, 4, 5, 6, 7, 8]
    rows = []
    current_row = []
    for lvl in levels:
        current_row.append({
            "type": "button", "style": "secondary", "height": "sm", "margin": "xs",
            "action": {"type": "postback", "label": f"第 {lvl} 級", "data": f"calc_step2_{district}_{lvl}", "displayText": f"CMS等級：第 {lvl} 級"}
        })
        if len(current_row) == 3:
            rows.append({"type": "box", "layout": "horizontal", "spacing": "xs", "contents": current_row})
            current_row = []
    if current_row:
        rows.append({"type": "box", "layout": "horizontal", "spacing": "xs", "contents": current_row})

    return FlexSendMessage(alt_text="試算: 選擇CMS等級", contents={
        "type": "bubble",
        "header": {"type": "box", "layout": "vertical", "contents": [
            {"type": "text", "text": "💰 補助試算 (2/3)", "weight": "bold", "size": "lg", "color": "#1DB446"},
            {"type": "text", "text": "請選擇您的長照需要等級(CMS)：", "size": "sm", "color": "#6B7280"}
        ]},
        "body": {"type": "box", "layout": "vertical", "spacing": "xs", "contents": rows}
    })

def get_calc_income_flex(district, level):
    """Step 3: Welfare Status Selection"""
    statuses = [
        ("一般戶 (16%)", "general"),
        ("中低收入戶 (5%)", "mid_low"),
        ("低收入戶 (0%)", "low")
    ]
    buttons = []
    for label, val in statuses:
        style = "primary" if val == "low" else "secondary"
        buttons.append({
            "type": "button", "style": style, "height": "sm", "margin": "sm",
            "action": {"type": "postback", "label": label, "data": f"calc_step3_{district}_{level}_{val}", "displayText": f"身分：{label.split(' ')[0]}"}
        })

    return FlexSendMessage(alt_text="試算: 選擇福利身分", contents={
        "type": "bubble",
        "header": {"type": "box", "layout": "vertical", "contents": [
            {"type": "text", "text": "💰 補助試算 (3/3)", "weight": "bold", "size": "lg", "color": "#1DB446"},
            {"type": "text", "text": "請選擇您的福利身分：", "size": "sm", "color": "#6B7280"}
        ]},
        "body": {"type": "box", "layout": "vertical", "spacing": "sm", "contents": buttons}
    })

def get_calc_result_flex(district, level, income_status):
    """Step 4: Final Output & Action"""
    care_caps = {2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180}
    copay_rates = {"general": 0.16, "mid_low": 0.05, "low": 0.0}
    status_labels = {"general": "一般戶", "mid_low": "中低收入戶", "low": "低收入戶"}
    
    level = int(level)
    care_cap = care_caps.get(level, 0)
    rate = copay_rates.get(income_status, 0.16)
    
    government_pays = care_cap * (1 - rate)
    user_pays = care_cap * rate
    
    return FlexSendMessage(alt_text="試算結果出爐", contents={
        "type": "bubble",
        "header": {
            "type": "box", "layout": "vertical", "backgroundColor": "#f3f4f6", "contents": [
                {"type": "text", "text": "📊 長照補助試算結果", "weight": "bold", "size": "lg", "color": "#2563EB"}
            ]
        },
        "body": {
            "type": "box", "layout": "vertical", "spacing": "md", "contents": [
                {"type": "text", "text": f"📍 區域: {district}", "size": "sm", "color": "#4B5563"},
                {"type": "text", "text": f"🎚️ 等級: 第 {level} 級", "size": "sm", "color": "#4B5563"},
                {"type": "text", "text": f"💳 身分: {status_labels[income_status]}", "size": "sm", "color": "#4B5563"},
                {"type": "separator", "margin": "lg"},
                {"type": "text", "text": "每月照顧及專業服務額度:", "size": "xs", "color": "#6B7280", "margin": "md"},
                {"type": "text", "text": f"${care_cap:,}", "size": "xl", "weight": "bold", "color": "#111827"},
                {"type": "box", "layout": "horizontal", "margin": "md", "contents": [
                    {"type": "text", "text": "🟢 政府補助:", "size": "sm", "color": "#6B7280"},
                    {"type": "text", "text": f"${round(government_pays):,}", "size": "sm", "weight": "bold", "color": "#1DB446", "align": "end"}
                ]},
                {"type": "box", "layout": "horizontal", "margin": "sm", "contents": [
                    {"type": "text", "text": "🔴 您的自負額:", "size": "sm", "color": "#6B7280"},
                    {"type": "text", "text": f"${round(user_pays):,}", "size": "sm", "weight": "bold", "color": "#EF4444", "align": "end"}
                ]}
            ]
        },
        "footer": {
            "type": "box", "layout": "vertical", "contents": [
                {
                    "type": "button", "style": "primary", "color": "#2563EB", "action": {
                        "type": "message", "label": f"🔎 尋找 {district} 長照機構", "text": district
                    }
                }
            ]
        }
    })

# ==========================================
# 3. WEBHOOK ROUTING
# ==========================================

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
            # --- 1. HANDLE TEXT MESSAGES ---
            if isinstance(event, MessageEvent) and isinstance(event.message, TextMessage):
                user_text = event.message.text.strip()
                
                if user_text == "尋找機構":
                    reply_message = get_district_select_flex_message()
                    
                elif user_text == "補助試算":
                    reply_message = get_calc_district_flex()

                elif user_text.lower() in ["hi", "hello", "你好", "您好", "選單", "幫助"]:
                    reply_message = TextSendMessage(
                        text="您好！我是桃園長照導航站 👵👴\n\n您可以直接點擊下方選單進行查詢或試算！"
                    )
                
                else:
                    reply_message = get_care_center_flex_message(user_text)
                
                line_bot_api.reply_message(event.reply_token, reply_message)
            
            # --- 2. HANDLE POSTBACK EVENTS (For Calculator Flow) ---
            elif isinstance(event, PostbackEvent):
                data = event.postback.data
                
                if data.startswith("calc_step1_"):
                    district = data.split("_")[2]
                    reply_message = get_calc_cms_flex(district)
                    line_bot_api.reply_message(event.reply_token, reply_message)
                    
                elif data.startswith("calc_step2_"):
                    parts = data.split("_")
                    district = parts[2]
                    level = parts[3]
                    reply_message = get_calc_income_flex(district, level)
                    line_bot_api.reply_message(event.reply_token, reply_message)
                    
                elif data.startswith("calc_step3_"):
                    parts = data.split("_")
                    district = parts[2]
                    level = parts[3]
                    income_status = parts[4]
                    
                    reply_message = get_calc_result_flex(district, level, income_status)
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