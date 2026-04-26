import os
import requests
import threading
import time
import traceback
from google import genai
from flask import Flask, jsonify
from flask_cors import CORS
from flask import request
from dotenv import load_dotenv
from notam_parser import process_notams

load_dotenv()
AVWX_TOKEN = os.getenv("AVWX_TOKEN", "").strip().replace(
    '"', '').replace("'", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip().replace(
    '"', '').replace("'", "")
client = genai.Client(api_key=GEMINI_API_KEY)

vatsim_cache = {
    "data": None,
    "is_fetching": False,
}

app = Flask(__name__)
CORS(app)


def fetch_vatsim_data_loop():
    url = "https://data.vatsim.net/v3/vatsim-data.json"
    while True:
        try:
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                vatsim_cache["data"] = res.json()
                print("✅ 成功更新 VATSIM 全域雷達資料")
        except Exception as e:
            print(f"❌ 背景抓取 VATSIM 失敗: {str(e)}")
        time.sleep(15)


threading.Thread(target=fetch_vatsim_data_loop, daemon=True).start()


@app.route("/", methods=["GET"])
def root():
    return jsonify({"message": "歡迎來到 AeroBrief 後端伺服器 (Flask)！引擎已啟動 🚀"})


@app.route("/api/status", methods=["GET"])
def get_status():
    return jsonify({
        "status": "online",
        "service": "AeroBrief Flask API",
        "vatsim_parser": "ready"
    })


@app.route("/api/weather/<icao>", methods=["GET"])
def get_weather(icao):
    try:
        icao = icao.upper()
        if not AVWX_TOKEN:
            return jsonify({"error": "server missing AVWX_TOKEN"}), 500

        avwx_headers = {
            "Authorization": AVWX_TOKEN,
            "User-Agent": "Mozilla/5.0"
        }
        faa_headers = {
            "User-Agent": "Mozilla/5.0",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        faa_data = {"searchType": 0, "designatorsForLocation": icao}

        metar_res = requests.get(
            f"https://avwx.rest/api/metar/{icao}", headers=avwx_headers, timeout=5)
        taf_res = requests.get(
            f"https://avwx.rest/api/taf/{icao}", headers=avwx_headers, timeout=5)
        station_res = requests.get(
            f"https://avwx.rest/api/station/{icao}", headers=avwx_headers, timeout=5)

        try:
            notam_res = requests.post(
                "https://notams.aim.faa.gov/notamSearch/search", headers=faa_headers, data=faa_data, timeout=5)
            notam_data = notam_res.json() if notam_res.status_code == 200 else None
        except:
            notam_data = None

        if metar_res.status_code != 200:
            return jsonify({"error": f"failed to fetch metar: {metar_res.text}"}), 500

        metar_data = metar_res.json()
        taf_data = taf_res.json() if taf_res.status_code == 200 else None
        station_data = station_res.json() if station_res.status_code == 200 else None

        formatted_runways = []
        if station_data and "runways" in station_data:
            for rwy in station_data["runways"]:
                if rwy.get("ident1"):
                    bearing1 = rwy.get("bearing1") or 0
                    formatted_runways.append({
                        "name": rwy.get("ident1"),
                        "heading": round(bearing1),
                        "isFirst": False
                    })
                if rwy.get("ident2"):
                    bearing2 = rwy.get("bearing2") or 0
                    formatted_runways.append({
                        "name": rwy.get("ident2"),
                        "heading": round(bearing2),
                        "isFirst": False
                    })

        processed_notams = process_notams(notam_data) if notam_data else []

        return jsonify({
            "taf": taf_data,
            "common": {**(station_data or {}), **metar_data},
            "runways": formatted_runways,
            "notam": processed_notams
        })

    except Exception as e:

        print(f"❌ Weather API Error for {icao}:")
        traceback.print_exc()
        return jsonify({"error": f"Weather Backend Error: {str(e)}"}), 500


@app.route("/api/vatsim/<icao>", methods=["GET"])
def get_vatsim(icao):
    try:
        icao = icao.upper()
        data = vatsim_cache.get("data")

        if not data:
            return jsonify({"error": "雷達系統啟動中，請等候"}), 503

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

        departures, arrivals, cruisings = [], [], []

        for p in data.get("pilots", []):
            fp = p.get("flight_plan")
            if not fp:
                continue

            pilot_info = {
                "callsign": p.get("callsign"),
                "name": p.get("name"),
                "cid": p.get("cid"),
                "aircraft_short": fp.get("aircraft_short"),
                "departure": fp.get("departure"),
                "arrival": fp.get("arrival"),
                "altitude": p.get("altitude") or 0,
                "cruising_altitude": fp.get("altitude") or "0",
                "groundspeed": p.get("groundspeed") or 0,
                "latitude": p.get("latitude"),
                "longitude": p.get("longitude"),
                "heading": p.get("heading")
            }

            is_departure = (pilot_info["departure"] == icao)
            is_arrival = (pilot_info["arrival"] == icao)

            if is_departure:
                departures.append(pilot_info)
            if is_arrival:
                arrivals.append(pilot_info)

            phase = "ENROUTE"
            try:
                curAlt = int(pilot_info["altitude"])
                gs = int(pilot_info["groundspeed"])
                tarAlt_str = str(pilot_info["cruising_altitude"]).upper()

                target_alt = 0
                if "FL" in tarAlt_str:
                    target_alt = int(tarAlt_str.replace("FL", "")) * 100
                elif tarAlt_str.isdigit():
                    target_alt = int(tarAlt_str)

                if gs < 45:
                    if is_arrival:
                        phase = "ARRIVED"
                    elif is_departure:
                        phase = "PRE_DEPARTURE"
                    else:
                        phase = "ON_GROUND"
                elif target_alt > 0:
                    if target_alt - 1000 <= curAlt <= target_alt + 1000:
                        phase = "CRUISING"
                    elif curAlt < target_alt - 1000:
                        if is_arrival:
                            phase = "DESCENDING"
                        elif is_departure:
                            phase = "CLIMBING"

                pilot_info["flight_phase"] = phase

                if phase == "CRUISING" and (is_departure or is_arrival):
                    cruisings.append(pilot_info)

            except Exception:
                pilot_info["flight_phase"] = "UNKNOWN"

        return jsonify({
            "controllers": controllers,
            "departures": departures,
            "arrivals": arrivals,
            "cruisings": cruisings
        })

    except Exception as e:

        print(f"❌ VATSIM API Error for {icao}:")
        traceback.print_exc()
        return jsonify({"error": f"VATSIM Backend Error: {str(e)}"}), 500


@app.route("/api/ai", methods=["POST"])
def ask_pilot():
    if not client:
        return jsonify({"error": "伺服器尚未設定 GEMINI_API_KEY"}), 500

    data = request.json
    icao = data.get("icao", "未知機場")
    question = data.get("question", "")

    try:
        prompt = f"""
        你是一位專業的航空簽派員與管制員。
        目前飛行員正在查詢 ICAO 代碼為 {icao} 的機場資訊。
        飛行員的問題是：{question}
        
        請用繁體中文回答，保持專業、簡潔，並提供真實的航空數據
        （例如最大支援機型、跑道長度限制、特殊進場程序、噪音管制等）。
        如果問題與航空無關，請委婉拒絕回答。
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=prompt,
        )
        return jsonify({"answer": response.text})

    except Exception as e:
        print("❌ LLM Error:", str(e))
        return jsonify({"error": f"AI 簽派員目前無法連線，錯誤: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(port=8000, debug=True)
