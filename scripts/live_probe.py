"""Probe real APIs for payload shapes/units. (output is ASCII-only on purpose)

用真實 API 確認資料格式/單位。

用法（PowerShell / bash 皆可，會自動讀 backend/.env 的 AVWX_TOKEN）：
    cd backend
    python ../scripts/live_probe.py RCTP KJFK ZBAA 2>&1 | Tee-Object ../probe.log

不會印出 token（只印長度）。
"""
import json
import os
import sys
import time

import httpx

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001
    pass

try:
    from dotenv import load_dotenv
    here = os.path.dirname(os.path.abspath(__file__))
    for p in (os.path.join(here, "..", "backend", ".env"), ".env"):
        if os.path.exists(p):
            load_dotenv(p)
except ImportError:
    pass

tok = os.getenv("AVWX_TOKEN", "").strip().strip("\"'")
icaos = sys.argv[1:] or ["RCTP", "KJFK", "ZBAA"]
if not tok:
    sys.exit("AVWX_TOKEN not found: put AVWX_TOKEN=xxx in backend/.env or set $env:AVWX_TOKEN")
print(f"token length = {len(tok)} (value not shown)")

H = {"Authorization": tok, "User-Agent": "AeroBrief-probe/1.0"}
CHROME = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def show(label, r, n=300):
    print(f"[{label}] HTTP {r.status_code}  type={r.headers.get('content-type')}  "
          f"server={r.headers.get('server')}  len={len(r.content)}")
    if r.status_code != 200:
        print("    body:", r.text[:n].replace("\n", " "))


def avwx(c, icao):
    for name in ("metar", "taf", "station"):
        t = time.time()
        try:
            r = c.get(f"https://avwx.rest/api/{name}/{icao}", headers=H)
        except Exception as e:  # noqa: BLE001
            print(f"[{name}] EXC {type(e).__name__}: {e}")
            continue
        rl = {k: v for k, v in r.headers.items()
              if "limit" in k.lower() or "remaining" in k.lower()}
        print(f"[{name}] HTTP {r.status_code} {time.time()-t:.2f}s ratelimit={rl}")
        if r.status_code != 200:
            print("    body:", r.text[:200])
            continue
        j = r.json()
        if name == "metar":
            for f in ("units", "wind_direction", "wind_speed", "wind_gust",
                      "visibility", "altimeter", "temperature", "flight_rules"):
                print("   ", f, "=", json.dumps(j.get(f), ensure_ascii=False))
            print("    raw =", j.get("raw"))
        elif name == "taf":
            fc = j.get("forecast") or [None]
            print("    first period:", json.dumps(fc[0], ensure_ascii=False)[:500])
        else:
            print("    elevation_ft:", j.get("elevation_ft"),
                  "| lat/lon:", j.get("latitude"), j.get("longitude"))
            print("    runways:", json.dumps(j.get("runways"), ensure_ascii=False)[:400])


FAA_URL = "https://notams.aim.faa.gov/notamSearch/search"
FAA_PAGE = "https://notams.aim.faa.gov/notamSearch/nsapp.html"


def inspect_notams(J, icao, client=None):
    """用專案的分類器跑真實 NOTAM，並測試第 2 頁 (offset=30) 是否可用。"""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
    try:
        from collections import Counter
        from notam_parser import SORT_ORDER, process_notams
        EN = ["RWY_CLOSED", "TWY_CLOSED", "RWY_INFO", "NAVAID", "AIRSPACE", "WORK_OBST", "TWY_INFO", "GENERAL"]
        name = lambda cat: EN[SORT_ORDER.get(cat, len(EN) - 1)]  # noqa: E731
        parsed = process_notams(J)
        print("    category histogram:", dict(Counter(name(x["category"]) for x in parsed)))
        print("    FAA error field =", repr(J.get("error")), "| filteredResultCount =", J.get("filteredResultCount"),
              "| start/endRecordCount =", J.get("startRecordCount"), J.get("endRecordCount"))
        print("    states:", dict(Counter(x["state"] for x in parsed)))
        from notam_parser import _body
        print("    --- GENERAL / TWY_INFO / WORK_OBST items (E-field, first 110 chars) ---")
        for x in parsed:
            if name(x["category"]) in ("GENERAL", "TWY_INFO", "WORK_OBST", "AIRSPACE", "TWY_CLOSED", "RWY_CLOSED"):
                one = " ".join(_body(x["raw"]).split())[:110]
                print("      [%s|%s] %s" % (name(x["category"]), x["state"], one))
        seen = set()
        for x in parsed:
            if x["category"] not in seen:
                seen.add(x["category"])
                body = x["raw"].replace("\n", " ")
                print("      sample [%s]: %s" % (name(x["category"]), body[-160:]))
    except Exception as e:  # noqa: BLE001
        print("    classifier check failed:", type(e).__name__, e)
    try:
        form = {"searchType": 0, "designatorsForLocation": icao, "formatType": "ICAO", "radius": -1,
                "offset": 30, "notamsOnly": "false", "sortColumns": "5 false", "sortDirection": "true"}
        hdr = {"User-Agent": CHROME, "Accept": "application/json, text/javascript, */*; q=0.01",
               "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
               "Origin": "https://notams.aim.faa.gov", "Referer": FAA_PAGE,
               "X-Requested-With": "XMLHttpRequest"}
        with httpx.Client(timeout=20) as c2:
            r2 = c2.post(FAA_URL, headers=hdr, data=form)
        L2 = r2.json().get("notamList", []) if r2.status_code == 200 else []
        ids1 = {i.get("notamNumber") for i in J.get("notamList", [])}
        ids2 = {i.get("notamNumber") for i in L2}
        print(f"    page2 (offset=30): HTTP {r2.status_code}, items={len(L2)}, overlap with page1={len(ids1 & ids2)}, "
              f"total after merge={len(ids1 | ids2)} (expect totalNotamCount)")
    except Exception as e:  # noqa: BLE001
        print("    page2 check failed:", type(e).__name__, e)


def faa(icao):
    base_form = {"searchType": 0, "designatorsForLocation": icao}
    full_form = {**base_form, "formatType": "ICAO", "radius": -1, "offset": 0,
                 "notamsOnly": "false", "sortColumns": "5 false", "sortDirection": "true"}
    browser_h = {
        "User-Agent": CHROME, "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": "https://notams.aim.faa.gov", "Referer": FAA_PAGE,
        "X-Requested-With": "XMLHttpRequest",
    }
    variants = [
        ("A minimal headers (old backend)", dict(headers={"User-Agent": "Mozilla/5.0",
                                      "Content-Type": "application/x-www-form-urlencoded"},
                                data=base_form), False),
        ("B full browser headers (new backend)", dict(headers=browser_h, data=full_form), False),
        ("C warm-up cookie then POST", dict(headers=browser_h, data=full_form), True),
    ]
    for label, kw, warm in variants:
        try:
            with httpx.Client(timeout=20, follow_redirects=True, http2=False) as c:
                if warm:
                    w = c.get(FAA_PAGE, headers={"User-Agent": CHROME})
                    print(f"    (warm-up GET {w.status_code}, cookies={list(c.cookies.keys())})")
                r = c.post(FAA_URL, **kw)
            show(f"FAA {label}", r)
            if r.status_code == 200:
                try:
                    J = r.json()
                    L = J.get("notamList", [])
                    print("    top-level keys:", sorted(J.keys()))
                    print("    totalNotamCount =", J.get("totalNotamCount"), "| page size =", len(L))
                    if L:
                        print("    item keys:", sorted(L[0].keys()))
                        print("    start/end:", L[0].get("startDate"), "|", L[0].get("endDate"))
                        print("    icaoMessage[0]      =", repr((L[0].get("icaoMessage") or "")[:300]))
                        print("    from4thWord[0]      =", repr((L[0].get("traditionalMessageFrom4thWord") or "")[:200]))
                        if label.startswith("B"):
                            inspect_notams(J, icao, c)
                except ValueError:
                    print("    not JSON:", r.text[:200])
        except Exception as e:  # noqa: BLE001
            print(f"[FAA {label}] EXC {type(e).__name__}: {e}")


with httpx.Client(timeout=15) as c:
    for icao in icaos:
        print(f"\n===== {icao} =====")
        avwx(c, icao)
        faa(icao)

    r = c.get("https://data.vatsim.net/v3/vatsim-data.json")
    d = r.json()
    ctrl = d["controllers"]
    print(f"\n[VATSIM] pilots={len(d['pilots'])} controllers={len(ctrl)} payload={len(r.content)//1024}KB")
    print("    controller keys:", sorted(ctrl[0].keys()) if ctrl else None)
    print("    facility distribution:", {f: sum(1 for x in ctrl if x.get('facility') == f)
                                       for f in sorted({x.get('facility') for x in ctrl})})
    print("    callsigns not matching AAA_BBB pattern:",
          [x["callsign"] for x in ctrl if "_" not in x["callsign"]][:10])
    fps = [p["flight_plan"]["altitude"] for p in d["pilots"] if p.get("flight_plan")]
    print("    non-numeric filed altitudes:", sorted({a for a in fps if not str(a).isdigit()})[:15])
