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

    avwx_headers = {"Authorization": f"{AVWX_TOKEN}"}
    faa_headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    faa_data = {"searchType": 0, "designatorsForLocation": icao}
    urls = {
        "taf": f"https://avwx.rest/api/taf/{icao}",
        "metar": f"https://avwx.rest/api/metar/{icao}",
        "station": f"https://avwx.rest/api/station/{icao}",
        "notam": f"https://notams.aim.faa.gov/notamSearch/search"
    }

    async with httpx.AsyncClient() as client:
        responses = await asyncio.gather(
            client.get(urls["taf"], headers=avwx_headers),
            client.get(urls["metar"], headers=avwx_headers),
            client.get(urls["station"], headers=avwx_headers),
            client.post(urls["notam"], headers=faa_headers, data=faa_data)
        )

        taf_res, metar_res, station_res, notam_res = responses

        if metar_res.status_code != 200:
            return {"error": f"無法獲取 {icao} 的氣象資料，請確認機場代碼是否正確。"}

        taf_data = taf_res.json() if taf_res.status_code == 200 else None
        metar_data = metar_res.json() if metar_res.status_code == 200 else None
        station_data = station_res.json() if station_res.status_code == 200 else None
        notam_data = notam_res.json() if notam_res.status_code == 200 else None
        safe_station = station_data if station_data else {}
        safe_metar = metar_data if metar_data else {}

        formatted_runways = []
        for rwy in station_data.get("runways", []) if station_data else []:
            if rwy.get("ident1"):
                formatted_runways.append({
                    "name": rwy.get("ident1"),
                    "heading": round(rwy.get("bearing1", 0)),
                    "isFirst": False
                })
            if rwy.get("ident1"):
                formatted_runways.append({
                    "name": rwy.get("ident2"),
                    "heading": round(rwy.get("bearing2", 0)),
                    "isFirst": False
                })

        final_data = {
            "taf": taf_data,
            "common": {**safe_station, **safe_metar},
            "runways": formatted_runways,
            "notam": process_notams(notam_data)
        }

        return final_data


@app.get("api/vatsim/${icao}")
async def get_vatsim(icao: str):
    icao = icao.upper()
    url = "https://data.vatsim.net/v3/vatsim-data.json"

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url)
            data = res.json() if res.status_code == 200 else {
                "error": "can't fecth vatsim data"}
        except Exception as e:
            return {"error": f"fetch vatsim data failed : {str(e)}"}

    controllers = []
    for c in data.get("controllers", []):
        callsign = c.get("callsign", "")
        if callsign.startswith(icao):
            controllers.append({
                "callsign": callsign,
                "frequency": c.get("frequency"),
                "name": c.get("name")
            })
    departures, arrivals = [], []

    for p in data.get("pilots", []):
        fp = p.get("flight_plan")
        if not p:
            continue
        else:
