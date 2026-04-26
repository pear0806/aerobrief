import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    print("❌ 找不到 API Key，請檢查 .env 檔案！")
else:
    print(f"🔑 使用 API Key: {API_KEY[:5]}...{API_KEY[-5:]}")
    try:
        client = genai.Client(api_key=API_KEY)
        # 把 print 的文字改成與實際呼叫的模型一致
        print("🚀 正在發送測試請求 (使用 gemini-2.5-flash-lite)...")

        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',  # 👈 這裡必須用官方全小寫的代碼格式
            contents="嗨！請回覆我『測試成功』",
        )
        print("✅ 測試成功！AI 回覆：", response.text)
    except Exception as e:
        print("❌ 測試失敗，錯誤訊息：", str(e))
