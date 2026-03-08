# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 1. 建立 FastAPI 應用程式實例
app = FastAPI(
    title="AeroBrief API",
    description="AeroBrief 的專屬後端伺服器",
    version="1.0.0"
)

# 2. 設定 CORS (跨域資源共用)
# 因為前端 (Vite) 跑在 localhost:5173，後端跑在 localhost:8000
# 如果沒有設定 CORS，瀏覽器會基於安全理由阻擋前端去抓後端的資料！
origins = [
    "http://localhost:5173",  # 允許本地端 Vite 前端連線
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,     # 允許哪些來源
    allow_credentials=True,    # 是否允許攜帶 Cookie
    allow_methods=["*"],       # 允許所有 HTTP 請求方法 (GET, POST, OPTIONS 等)
    allow_headers=["*"],       # 允許所有 HTTP 標頭
)

# 3. 建立你的第一個 API 路由 (Route)


@app.get("/")
async def root():
    return {"message": "歡迎來到 AeroBrief 後端伺服器！引擎已啟動 🚀"}


@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "service": "AeroBrief Backend API",
        "vatsim_parser": "ready",
        "weather_parser": "ready"
    }
