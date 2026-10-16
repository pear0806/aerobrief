import asyncio
import logging
import os
import re
import time
from contextlib import asynccontextmanager, suppress
from types import SimpleNamespace
from typing import Any, Dict, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from notam_parser import process_notams

load_dotenv()
log = logging.getLogger("aerobrief")

AVWX_TOKEN = os.getenv("AVWX_TOKEN", "").strip().replace(
    '"', '').replace("'", "")
ICAO_RE = re.compile(r"^[A-Z0-9]{4}$")

DEFAULT_ORIGINS = ["http://localhost:5173", "https://aerobrief.vercel.app"]
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", ",".join(DEFAULT_ORIGINS)).split(",") if o.strip()]

# ---------------------------------------------------------------- TTL 快取
# METAR 約 30~60 分鐘才更新；前端輪詢不該每次都打 AVWX / FAA。
TTL_SECONDS = {"metar": 120, "taf": 600, "station": 86400, "notam": 600}
_cache: Dict[str, tuple] = {}


_FAILED = object()  # 負快取標記


def cache_get(key: str):
    hit = _cache.get(key)
    if hit and hit[0] > time.monotonic():
        return hit[1]
    _cache.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl: int):
    _cache[key] = (time.monotonic() + ttl, value)


# ---------------------------------------------------------------- VATSIM 背景抓取
vatsim_cache = {"data": None, "updated_at": None}


async def fetch_vatsim_data_loop():
    url = "https://data.vatsim.net/v3/vatsim-data.json"
    async with httpx.AsyncClient(timeout=10) as client:
        while True:
            try:
                res = await client.get(url)
                if res.status_code == 200:
                    vatsim_cache["data"] = res.json()
                    vatsim_cache["updated_at"] = time.time()
                else:
                    log.warning("VATSIM HTTP %s", res.status_code)
            except Exception as e:  # noqa: BLE001
                log.warning("背景抓取 VATSIM 失敗: %s", e)
            await asyncio.sleep(15)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(fetch_vatsim_data_loop())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="AeroBrief API", description="AeroBrief Backend",
              version="1.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def error_response(message: str, status: int = 400):
    return JSONResponse(status_code=status, content={
        "success": False, "data": None, "error": {"message": message}})


# ---------------------------------------------------------------- 工具
async def fetch_json(key: str, ttl: int, call, fail_ttl: int = 0):
    """回傳 (data, error)。任何失敗都轉成 error 字串，不會往外拋。
    fail_ttl>0 時會短暫記住失敗（例如 FAA 持續 403），避免每次請求都去撞被擋的來源。"""
    cached = cache_get(key)
    if cached is not None:
        if isinstance(cached, tuple) and cached and cached[0] is _FAILED:
            return None, cached[1]
        return cached, None

    def fail(msg):
        if fail_ttl:
            cache_set(key, (_FAILED, msg), fail_ttl)
        return None, msg

    try:
        res = await call()
    except Exception as e:  # noqa: BLE001
        return fail(type(e).__name__)
    if res.status_code != 200:
        return fail(f"HTTP {res.status_code}")
    try:
        data = res.json()
    except ValueError:
        return fail("invalid JSON")
    cache_set(key, data, ttl)
    return data, None


def runway_heading(ident: Optional[str], bearing) -> Optional[int]:
    """優先用 bearing；缺值時用跑道號碼 ×10 估算（不再退回 0°）。"""
    if bearing is not None:
        return round(bearing) % 360
    m = re.match(r"\d{1,2}", ident or "")
    return (int(m.group()) * 10) % 360 if m else None


def parse_altitude(value) -> Optional[int]:
    """VATSIM 飛行計畫高度 → 英尺。FL350 / F350 / A050 = ×100；純數字 <1000 視為 FL。"""
    s = str(value or "").strip().upper()
    m = re.fullmatch(r"(?:FL|F|A)\s*(\d{2,3})", s)
    if m:
        return int(m.group(1)) * 100
    if s.isdigit():
        n = int(s)
        return n * 100 if n < 1000 else n
    return None


# ---------------------------------------------------------------- FAA NOTAM
# 實測 (2026-10-16)：只帶 "Mozilla/5.0" 的精簡請求會被 Akamai 擋 (403 Access Denied)；
# 帶完整瀏覽器標頭 + 完整表單則回 200。此為非官方介面，可能隨時改版。
FAA_URL = "https://notams.aim.faa.gov/notamSearch/search"
FAA_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://notams.aim.faa.gov",
    "Referer": "https://notams.aim.faa.gov/notamSearch/nsapp.html",
    "X-Requested-With": "XMLHttpRequest",
}
FAA_PAGE_SIZE = 30   # 實測單頁最多 30 筆
FAA_MAX_PAGES = 4


def _notam_id(item):
    return item.get("notamNumber") or item.get("transactionID") or id(item)


async def fetch_faa_notams(client, icao: str):
    """抓 FAA NOTAM（含分頁，最多 FAA_MAX_PAGES 頁）。回傳像 httpx.Response 的物件。
    資料不完整時於結果加上 _truncated=True。"""
    def form(offset):
        return {"searchType": 0, "designatorsForLocation": icao, "formatType": "ICAO",
                "radius": -1, "offset": offset, "notamsOnly": "false",
                "sortColumns": "5 false", "sortDirection": "true"}

    first = await client.post(FAA_URL, headers=FAA_HEADERS, data=form(0))
    if first.status_code != 200:
        return first
    try:
        data = first.json()
    except ValueError:
        return first

    err = data.get("error")
    if err:  # 實測正常回應為空字串；非空代表 FAA 回報錯誤
        return SimpleNamespace(status_code=502, json=lambda: {"error": err})

    items = list(data.get("notamList") or [])
    total = data.get("totalNotamCount")
    seen = {_notam_id(i) for i in items}

    if isinstance(total, int) and len(items) < total and items:
        step = len(items)  # 第一頁實際筆數（實測 30）
        offsets = list(range(step, min(total, step * FAA_MAX_PAGES), step))

        async def page(off):
            try:
                r = await client.post(FAA_URL, headers=FAA_HEADERS, data=form(off))
                return (r.json().get("notamList") or []) if r.status_code == 200 else []
            except Exception:  # noqa: BLE001  單頁失敗：保留其餘頁
                return []

        for more in await asyncio.gather(*(page(o) for o in offsets)):
            for i in more:
                if _notam_id(i) not in seen:
                    seen.add(_notam_id(i))
                    items.append(i)

    if isinstance(total, int):
        truncated = len(items) < total
    else:  # 沒有總數欄位時，剛好滿一頁就視為可能不完整
        truncated = len(items) >= FAA_PAGE_SIZE
    data = {**data, "notamList": items, "_truncated": truncated,
            "_total": total if isinstance(total, int) else None}
    return SimpleNamespace(status_code=200, json=lambda: data)


# ---------------------------------------------------------------- 天氣
async def get_weather(icao: str):
    icao = (icao or "").strip().upper()
    if not ICAO_RE.match(icao):
        return {"error": "ICAO 代碼格式不正確（需為 4 碼英數字）", "status": 400}
    if not AVWX_TOKEN:
        return {"error": "server missing AVWX_TOKEN", "status": 500}

    avwx_headers = {"Authorization": AVWX_TOKEN, "User-Agent": "AeroBrief/1.1"}

    async with httpx.AsyncClient(timeout=10) as client:
        (taf, taf_err), (metar, metar_err), (station, st_err), (notam, notam_err) = \
            await asyncio.gather(
                fetch_json(f"taf:{icao}", TTL_SECONDS["taf"], lambda: client.get(
                    f"https://avwx.rest/api/taf/{icao}", headers=avwx_headers)),
                fetch_json(f"metar:{icao}", TTL_SECONDS["metar"], lambda: client.get(
                    f"https://avwx.rest/api/metar/{icao}", headers=avwx_headers)),
                fetch_json(f"station:{icao}", TTL_SECONDS["station"], lambda: client.get(
                    f"https://avwx.rest/api/station/{icao}", headers=avwx_headers)),
                fetch_json(f"notam:{icao}", TTL_SECONDS["notam"],
                           lambda: fetch_faa_notams(client, icao), fail_ttl=300),
            )

    # METAR / 測站是必要資料；TAF / NOTAM 失敗則降級並回報 warnings
    if metar is None:
        return {"error": f"無法取得 {icao} 的 METAR（{metar_err}）", "status": 502}
    if station is None:
        return {"error": f"無法取得 {icao} 的測站資料（{st_err}）", "status": 502}

    warnings = []
    if taf is None:
        warnings.append(f"TAF 暫時無法取得（{taf_err}）")
    if notam is None:
        warnings.append(f"NOTAM 暫時無法取得（{notam_err}）")
    elif notam.get("_truncated"):
        total = notam.get("_total")
        shown = len(notam.get("notamList") or [])
        warnings.append(
            f"NOTAM 可能不完整：僅顯示 {shown} 筆" + (f"（共 {total} 筆）" if total else "")
            + "，請另行查閱官方 NOTAM")

    runways = []
    for rwy in station.get("runways") or []:
        for n in ("1", "2"):
            ident = rwy.get(f"ident{n}")
            if not ident:
                continue
            heading = runway_heading(ident, rwy.get(f"bearing{n}"))
            if heading is None:
                continue
            runways.append({"name": ident, "heading": heading, "isFirst": False})

    return {
        "taf": taf,
        "common": {**station, **metar},
        "runways": runways,
        "notam": process_notams(notam),
        "warnings": warnings,
    }


# ---------------------------------------------------------------- VATSIM
async def get_vatsim(icao: str):
    icao = (icao or "").strip().upper()
    data = vatsim_cache["data"]
    if not data:
        return {"error": "雷達系統啟動中，請稍候"}

    controllers = []
    for c in data.get("controllers", []):
        callsign = c.get("callsign", "")
        parts = callsign.upper().split("_")
        # 觀察員 (facility 0 / *_OBS) 不是航管，排除
        if c.get("facility") == 0 or parts[-1] == "OBS":
            continue
        # 以 "_" 分段精確比對，避免 RCTPX_xxx 命中 RCTP；支援 WSSS_3_GND 這類多段呼號
        if parts[0] == icao:
            controllers.append({"callsign": callsign, "cid": c.get("cid"),
                                "frequency": c.get("frequency"), "name": c.get("name")})

    order_map = {s: i for i, s in enumerate(
        ["DEL", "GND", "TWR", "DEP", "APP", "CTR"])}
    controllers.sort(key=lambda x: order_map.get(
        x["callsign"].upper().split("_")[-1], 99))

    departures, arrivals, cruisings = [], [], []
    for p in data.get("pilots", []):
        fp = p.get("flight_plan")
        if not fp:
            continue
        dep = (fp.get("departure") or "").upper()
        arr = (fp.get("arrival") or "").upper()
        is_dep, is_arr = dep == icao, arr == icao
        if not (is_dep or is_arr):
            continue

        info = {
            "callsign": p.get("callsign"), "name": p.get("name"), "cid": p.get("cid"),
            "aircraft_short": fp.get("aircraft_short"),
            "departure": fp.get("departure"), "arrival": fp.get("arrival"),
            "altitude": p.get("altitude"), "cruising_altitude": fp.get("altitude"),
            "groundspeed": p.get("groundspeed"),
            "latitude": p.get("latitude"), "longitude": p.get("longitude"),
            "heading": p.get("heading"),
        }
        if is_dep:
            departures.append(info)
        if is_arr:
            arrivals.append(info)

        cur = p.get("altitude")
        target = parse_altitude(fp.get("altitude"))
        airborne = (p.get("groundspeed") or 0) > 80
        if (target is not None and isinstance(cur, (int, float)) and airborne
                and target - 1000 <= cur <= target + 1000):
            cruisings.append(info)

    age = None
    if vatsim_cache["updated_at"]:
        age = round(time.time() - vatsim_cache["updated_at"])
    return {"controllers": controllers, "departures": departures,
            "arrivals": arrivals, "cruisings": cruisings, "data_age_s": age}


# ---------------------------------------------------------------- Gateway
class GatewayRequest(BaseModel):
    action: str
    payload: Dict[str, Any] = {}


@app.post("/api/gateway")
async def api_gateway(req: GatewayRequest):
    try:
        if req.action in ("GET_FULL_BRIEFING", "GET_VATSIM"):
            icao = str(req.payload.get("icao", "")).strip().upper()
            if not icao:
                return error_response("缺少 ICAO 代碼", 400)
            if not ICAO_RE.match(icao):
                return error_response("ICAO 代碼格式不正確（需為 4 碼英數字）", 400)

            if req.action == "GET_VATSIM":
                return {"success": True, "data": await get_vatsim(icao), "error": None}

            weather_res, vatsim_res = await asyncio.gather(
                get_weather(icao), get_vatsim(icao), return_exceptions=True)

            if isinstance(weather_res, Exception):
                log.exception("weather failed", exc_info=weather_res)
                return error_response("天氣資料擷取發生內部錯誤", 500)
            if "error" in weather_res:
                return error_response(weather_res["error"], weather_res.get("status", 502))
            if isinstance(vatsim_res, Exception):
                vatsim_res = {"error": "VATSIM 資料擷取失敗"}

            return {"success": True, "error": None, "data": {
                "icao": icao,
                "weather": weather_res["common"],
                "taf": weather_res["taf"],
                "runways": weather_res["runways"],
                "notams": weather_res["notam"],
                "warnings": weather_res["warnings"],
                "vatsim": vatsim_res,
            }}

        return error_response(f"未知的操作: {req.action}", 400)
    except Exception:  # noqa: BLE001
        log.exception("gateway error")
        return error_response("伺服器內部錯誤", 500)


@app.get("/")
async def root():
    return {"message": "AeroBrief backend is running"}


@app.get("/api/status")
async def get_status():
    return {"status": "online", "service": "AeroBrief Backend API",
            "vatsim_ready": vatsim_cache["data"] is not None,
            "has_avwx_token": bool(AVWX_TOKEN)}


@app.get("/api/weather/{icao}")
async def weather_endpoint(icao: str):
    out = await get_weather(icao)
    if "error" in out:
        return JSONResponse(status_code=out.get("status", 502), content={"error": out["error"]})
    return out


@app.get("/api/vatsim/{icao}")
async def vatsim_endpoint(icao: str):
    icao = icao.strip().upper()
    if not ICAO_RE.match(icao):
        return JSONResponse(status_code=400, content={"error": "ICAO 代碼格式不正確"})
    out = await get_vatsim(icao)
    if "error" in out:
        return JSONResponse(status_code=503, content=out)
    return out
