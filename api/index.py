import os
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import MessageEvent, TextMessage, TextSendMessage

load_dotenv()

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

line_bot_api = LineBotApi(os.environ.get("LINE_CHANNEL_ACCESS_TOKEN"))
handler = WebhookHandler(os.environ.get("LINE_CHANNEL_SECRET"))

app = FastAPI()
@app.get("/")
def read_root():
    return {"status": "Taoyuan Care Platform Backend is running!"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class UserProfile(BaseModel):
    cms_level: int
    income_status: str
@app.post("/api/webhook")
@app.post("/api/calculate-subsidy")
def calculate_subsidy(profile: UserProfile):
    # Your existing subsidy logic...
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

# --- Background Task for LINE Reply ---
def process_line_message(event):
    user_text = event.message.text
    
    try:
        if "日照" in user_text or "長照" in user_text or "推薦" in user_text:
            response = supabase.table('care_centers').select('name, address, phone').limit(3).execute()
            centers = response.data
            
            if centers:
                reply_text = "這裡為您推薦桃園區的機構：\n\n"
                for c in centers:
                    reply_text += f"🏠 {c['name']}\n📍 {c['address']}\n📞 {c['phone']}\n\n"
                reply_text += "想要看更多詳細資訊嗎？點擊這裡：[您的網址]"
            else:
                reply_text = "目前資料庫中沒有找到相關資料。"
                
            line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text=reply_text)
            )
        else:
            line_bot_api.reply_message(
                event.reply_token,
                TextSendMessage(text="您好！我是桃園長照導航站。請輸入您的需求（例如：「推薦日照中心」），我會為您尋找適合的機構。")
            )
    except Exception as e:
        print(f"Error processing message: {e}")

# --- LINE Bot Webhook Endpoint ---
# --- Serverless-Optimized LINE Webhook ---
@app.post("/webhook")
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
                
                if "日照" in user_text or "長照" in user_text or "推薦" in user_text:
                    response = supabase.table('care_centers').select('name, address, phone').limit(3).execute()
                    centers = response.data
                    
                    if centers:
                        reply_text = "這裡為您推薦桃園區的機構：\n\n"
                        for c in centers:
                            reply_text += f"🏠 {c['name']}\n📍 {c['address']}\n📞 {c['phone']}\n\n"
                        reply_text += "想要看更多詳細資訊嗎？點擊這裡：[您的網址]"
                    else:
                        reply_text = "目前資料庫中沒有找到相關資料。"
                        
                    line_bot_api.reply_message(
                        event.reply_token,
                        TextSendMessage(text=reply_text)
                    )
                else:
                    line_bot_api.reply_message(
                        event.reply_token,
                        TextSendMessage(text="您好！我是桃園長照導航站。請輸入您的需求（例如：「推薦日照中心」），我會為您尋找適合的機構。")
                    )
                    
    except InvalidSignatureError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        print(f"Error processing message: {e}")

    return 'OK'