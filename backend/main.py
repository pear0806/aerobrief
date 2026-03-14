import os
import httpx
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from notam_parser import process_notams

load_dotenv()
AVWX_TOKEN = os.getenv("AVWX_TOKEN", "").strip().replace(
    '"', '').replace("'", "")

vatsim_cache = {
    "data": None,
    "is_fetching": False,
}


async def fetch_vatsim_data_loop():
    url = "https://data.vatsim.net/v3/vatsim-data.json"
    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                res = await client.get(url)
                if res.status_code == 200:
                    vatsim_cache["data"] = res.json()
                    print("✅ 成功更新 VATSIM 全域雷達資料")
            except Exception as e:
                print(f"❌ 背景抓取 VATSIM 失敗: {str(e)}")

            await asyncio.sleep(15)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(fetch_vatsim_data_loop())
    yield
    task.cancel()

app = FastAPI(
    title="AeroBrief API",
    description="AeroBrief Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

    avwx_headers = {"Authorization": f"{AVWX_TOKEN}",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
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

    async with httpx.AsyncClient(timeout=10) as client:
        responses = await asyncio.gather(
            client.get(urls["taf"], headers=avwx_headers),
            client.get(urls["metar"], headers=avwx_headers),
            client.get(urls["station"], headers=avwx_headers),
            client.post(urls["notam"], headers=faa_headers, data=faa_data),
            return_exceptions=True
        )

        taf_res, metar_res, station_res, notam_res = responses

        if metar_res.status_code != 200:
            return {"error": f"無法獲取 {icao} 的氣象資料。錯誤碼: {metar_res.status_code}, 原因: {metar_res.text}"}

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
            if rwy.get("ident2"):
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


@app.get("/api/vatsim/{icao}")
async def get_vatsim(icao: str):
    icao = icao.upper()

    data = vatsim_cache["data"]

    if not data:
        return {"error": "雷達系統啟動中，請等候"}

    controllers = []
    for c in data.get("controllers", []):
        callsign = c.get("callsign", "")
        if callsign.upper().startswith(icao):
            controllers.append({
                "callsign": callsign,
                "frequency": c.get("frequency"),
                "name": c.get("name")
            })

    order = ["DLE", "GND", "TWR", "DEP", "APP", "CTR"]
    order_map = {suffix: index for index, suffix in enumerate(order)}
    controllers.sort(key=lambda x: order_map.get(
        x["callsign"].upper().split("_")[-1], 99))

    departures, arrivals = [], []

    for p in data.get("pilots", []):
        fp = p.get("flight_plan")
        if not fp:
            continue
        else:
            pilot_info = {
                "callsign": p.get("callsign"),
                "name": p.get("name"),
                "cid": p.get("cid"),
                "aircraft_short": fp.get("aircraft_short"),
                "departure": fp.get("departure"),
                "arrival": fp.get("arrival"),
                "altitude": p.get("altitude"),
                "cruising_altitude": fp.get("altitude"),
                "groundspeed": p.get("groundspeed"),
                "latitude": p.get("latitude"),
                "longitude": p.get("longitude"),
                "heading": p.get("heading")
            }

            if pilot_info["departure"] == icao:
                departures.append(pilot_info)

            if pilot_info["arrival"] == icao:
                arrivals.append(pilot_info)

    final_data = {
        "controllers": controllers,
        "departures": departures,
        "arrivals": arrivals
    }

    return final_data
