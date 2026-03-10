# backend/main.py
import os
import httpx
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from notam_parser import process_notams

load_dotenv()
AVWX_TOKEN = os.getenv("AVWX_TOKEN")

app = FastAPI(
    title="AeroBrief API",
    description="AeroBrief Backend",
    version="1.0.0"
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/api/weather/{icao}")
async def get_weather(icao: str):
    if not AVWX_TOKEN:
        return {"error": "伺服器遺失 AVWX_TOKEN"}

    headers = {"Authorization": f"{AVWX_TOKEN}"}
    urls = {
        "taf": f"https://avwx.rest/api/taf/{icao}",
        "metar": f"https://avwx.rest/api/metar/{icao}",
        "station": f"https://avwx.rest/api/station/{icao}",
        "notam": f"https://avwx.rest/api/notam/{icao}",
    }

    async with httpx.AsyncClient() as client:
        responses = await asyncio.gather(
            client.get(urls["taf"], headers=headers),
            client.get(urls["metar"], headers=headers),
            client.get(urls["station"], headers=headers),
            client.get(urls["notam"], headers=headers)
        )

        taf_res, metar_res, station_res, notam_res = responses

        if metar_res.status_code != 200:
            return {"error": f"無法獲取 {icao} 的氣象資料，請確認機場代碼是否正確。"}

        taf_data = taf_res.json() if taf_res.status_code == 200 else None
        metar_data = metar_res.json() if metar_res.status_code == 200 else None
        station_data = station_res.json() if station_res.status_code == 200 else None

        raw_notam = notam_res.json() if notam_res.status_code == 200 else None
        clean_notams = process_notams(raw_notam)

        safe_station = station_data if station_data else {}
        safe_metar = metar_data if metar_data else {}

        common_data = {**safe_station, **safe_metar}

        return {
            "taf": taf_data,
            "common": common_data,
            "runways": station_data.get("runways", []) if station_data else [],
            "notam": clean_notams,

        }
