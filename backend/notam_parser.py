"""NOTAM 分類。

規則：
1. 只看 E) 欄位（本文），避免 Q 行代碼造成誤判。
2. 用單字邊界比對（\\b），避免 FAVORABLE 命中 VOR 之類的子字串誤判。
3. 「NOT CLSD」視為否定，不算關閉。
4. 以「最先出現的設施關鍵字」判定主題（ILS RWY 05L U/S → 導航設施；
   CRANE ... RWY 23 → 障礙物），但只要 RWY/TWY 後方緊接 CLSD，
   一律以關閉優先（安全優先）。
"""
import re
from functools import lru_cache
from datetime import datetime, timezone

_RWY = re.compile(r"\b(?:RWY|RUNWAY)\b")
_TWY = re.compile(r"\b(?:TWY|TAXIWAY)\b")
_NAV = re.compile(
    r"\b(?:ILS|LLZ|VOR|DME|NDB|TACAN|VORTAC|RNAV|NAV|PAPI|VASI|ALS)\b")
_WORK = re.compile(
    r"\b(?:WIP|WORK IN PROGRESS|CRANES?|OBST|OBSTACLES?|OBSTRUCTION|CONSTRUCTION)\b")
_AIRSPACE = re.compile(
    r"\b(?:UNMANNED|DRONES?|UAS|UAV|FIREWORKS|ROCKETS?|LASER|PARACHUTE|BALLOONS?)\b")
_CLSD = re.compile(r"\b(?:CLSD|CLOSED|CLOSURE)\b")
# 機場整場關閉：AD / AP / AERODROME / AIRPORT 必須「緊接」在 CLSD 前（避免 "AD TWY A CLSD" 誤判）
_AD_CLSD = re.compile(
    r"\b(?:AD|AP|AERODROME|AIRPORT)\b(?:\s+(?:AD|AP|AERODROME|AIRPORT)\b)*\s+(?:CLSD|CLOSED|CLOSURE)\b")
# 「RWY 05L/23R NOT AVBL / U/S」：跑道號碼後「緊接」不可用字樣才算跑道不可用
# （"RWY 05L PAPI NOT AVBL"、"RWY 05L LGT U/S" 中間夾了設施字，不算）
_RWY_IDS = r"\d{2}[LRC]?(?:\s*(?:/|,|AND)\s*\d{2}[LRC]?)*"
_RWY_UNAVBL = re.compile(
    r"\b(?:RWYS?|RUNWAYS?)\s+(" + _RWY_IDS + r")\s+(?:NOT\s+AVBL|NOT\s+AVAILABLE|UNAVBL|UNAVAILABLE|U/S)\b")
_RWY_WITH_IDS = re.compile(r"\b(?:RWYS?|RUNWAYS?)\s+(" + _RWY_IDS + r")\b")
_ALL_RWY = re.compile(r"\bALL\s+(?:RWYS?|RUNWAYS?)\b")
_IDENT = re.compile(r"\d{2}[LRC]?")
_PARKING_ONLY = re.compile(r"\s*(?:FOR|TO)\s+(?:ACFT\s+)?(?:PRKG|PARKING|STANDS?|TOWING)\b")

CAT_AD_CLOSED = "🚨 機場關閉"
CAT_RWY_CLOSED = "🚨 跑道關閉"
CAT_TWY_CLOSED = "🚧 滑行道關閉"
CAT_RWY = "🛫 跑道資訊"
CAT_NAV = "📡 導航設施"
CAT_AIRSPACE = "⚠️ 空域活動（無人機／煙火等）"
CAT_WORK = "🏗️ 施工與障礙物"
CAT_TWY = "🚕 滑行道資訊"
CAT_GENERAL = "📝 一般資訊"

SORT_ORDER = {
    CAT_AD_CLOSED: -1, CAT_RWY_CLOSED: 0, CAT_TWY_CLOSED: 1, CAT_RWY: 2, CAT_NAV: 3,
    CAT_AIRSPACE: 4, CAT_WORK: 5, CAT_TWY: 6, CAT_GENERAL: 7,
}


def _body(raw_text: str) -> str:
    m = re.search(r"(?:^|\s)E\)\s*(.*?)(?=\s[F-G]\)|\Z)", raw_text, re.S)
    return (m.group(1) if m else raw_text).upper()


def _is_negated(text: str, pos: int) -> bool:
    return text[:pos].rstrip().endswith("NOT")


# 以 . ; , 切子句（不切小數點，如 250344.75N）。關閉判斷在「子句」內進行，
# 不再用固定字元視窗——真實資料中 "TWY S BTN S4(EXCLUDED) AND S5(EXCLUDED) CLSD"
# 的 CLSD 離 TWY 超過 40 字元，舊的視窗法會漏掉。
_CLAUSE_SPLIT = re.compile(r"[.;,](?!\d)")


def _idents(text: str):
    return _IDENT.findall(text)


def analyze_closure(text: str):
    """回傳 (kind, runways, ad_closed)。

    kind: 'ad'（機場關閉）/ 'rwy' / 'twy' / None；優先順序 ad > rwy > twy。
    runways: 被公告關閉的跑道號碼（如 ['05L','23R']）；'ALL' 代表全部跑道；
             有關閉但抓不到號碼時為空 list（前端仍會顯示 NOTAM 警示）。
    導航設施在前（ILS RWY 05L CLSD）不算跑道關閉。
    """
    found_twy, found_ad = False, False
    runways, seen_rwy_closure = [], False

    for clause in _CLAUSE_SPLIT.split(text):
        # --- 機場關閉
        for am in _AD_CLSD.finditer(clause):
            end_word = _CLSD.search(clause, am.start())
            if end_word and _is_negated(clause, end_word.start()):
                continue
            if not _PARKING_ONLY.match(clause[am.end(): am.end() + 30]):
                found_ad = True

        # --- RWY ... NOT AVBL / U/S（僅限號碼緊接）
        for um in _RWY_UNAVBL.finditer(clause):
            nav = _NAV.search(clause[: um.start()])
            if nav:
                continue
            seen_rwy_closure = True
            runways.extend(_idents(um.group(1)))

        # --- CLSD / CLOSED / CLOSURE
        for cm in _CLSD.finditer(clause):
            if _is_negated(clause, cm.start()):
                continue
            # "CLSD FOR ACFT PRKG (AND TOWING)" 只是停機用途關閉，滑行/起降不受影響
            if _PARKING_ONLY.match(clause[cm.end(): cm.end() + 30]):
                continue
            before = clause[: cm.start()]
            nav = _NAV.search(before)
            rwy, twy = _RWY.search(before), _TWY.search(before)
            if rwy and not (nav and nav.start() < rwy.start()):
                seen_rwy_closure = True
                for rm in _RWY_WITH_IDS.finditer(before):
                    runways.extend(_idents(rm.group(1)))
                if _ALL_RWY.search(before):
                    runways.append("ALL")
            elif twy and not (nav and nav.start() < twy.start()):
                found_twy = True

    runways = sorted(set(runways))
    if found_ad:
        return "ad", runways, True
    if seen_rwy_closure:
        return "rwy", runways, False
    return ("twy" if found_twy else None), [], False


def _closure_kind(text: str):
    """相容舊介面：只回傳 'rwy' / 'twy' / None（機場關閉視為最嚴重的 'rwy'）。"""
    kind, _, _ = analyze_closure(text)
    return "rwy" if kind == "ad" else kind


@lru_cache(maxsize=4096)
def classify_notam(raw_text: str):
    """(category, closed_runways, aerodrome_closed)。只與文字有關、與時間無關 → 可安全快取，
    同一則 NOTAM 在上游快取有效期間內每個請求都會重複出現。"""
    text = _body(raw_text or "")
    kind, rwys, ad = analyze_closure(text)
    if kind == "ad":
        return CAT_AD_CLOSED, tuple(rwys), ad
    if kind == "rwy":
        return CAT_RWY_CLOSED, tuple(rwys), ad
    if kind == "twy":
        return CAT_TWY_CLOSED, (), ad
    hits = {}
    for name, rx in (("nav", _NAV), ("air", _AIRSPACE), ("work", _WORK),
                     ("rwy", _RWY), ("twy", _TWY)):
        m = rx.search(text)
        if m:
            hits[name] = m.start()
    if not hits:
        return CAT_GENERAL, (), ad
    subject = min(hits, key=hits.get)
    cat = {"nav": CAT_NAV, "air": CAT_AIRSPACE, "work": CAT_WORK,
           "rwy": CAT_RWY, "twy": CAT_TWY}[subject]
    return cat, (), ad


def categorize_notam(raw_text: str) -> str:
    return classify_notam(raw_text or "")[0]


# FAA 回傳格式： "08/14/2026 0835"、"10/31/2026 0900EST"、"PERM"。
# 時間為 UTC（與 ICAO B)/C) 欄位數字一致）；結尾的 EST 是 ICAO 的「預估 (estimated)」，不是美東時區。
_FAA_DT = re.compile(r"^\s*(\d{2})/(\d{2})/(\d{4})\s+(\d{2})(\d{2})\s*(EST)?\s*$", re.I)

STATE_RANK = {"active": 0, "unknown": 1, "upcoming": 2}


def parse_faa_datetime(value):
    """回傳 (datetime(UTC) | None, estimated: bool)。PERM 或無法解析 → (None, False)。"""
    if not value:
        return None, False
    m = _FAA_DT.match(str(value))
    if not m:
        return None, False
    mo, d, y, hh, mm, est = m.groups()
    try:
        dt = datetime(int(y), int(mo), int(d), int(hh), int(mm), tzinfo=timezone.utc)
    except ValueError:
        return None, False
    return dt, bool(est)


def notam_state(start, end, now):
    """active / upcoming / expired / unknown（沒有可解析的開始時間）。"""
    if start and start > now:
        return "upcoming"
    if end and end < now:
        return "expired"
    return "active" if start else "unknown"


def _fmt(dt, estimated=False):
    return dt.strftime("%Y-%m-%d %H:%MZ") + (" (預估)" if estimated else "")


def process_notams(notam, now=None):
    if not notam or "notamList" not in notam:
        return []
    now = now or datetime.now(timezone.utc)

    parsed = []
    for item in notam.get("notamList", []):
        raw_text = item.get("icaoMessage") or ""
        if not raw_text.strip():
            raw_text = item.get("traditionalMessageFrom4thWord") or ""
        if not raw_text.strip():
            continue

        start, _ = parse_faa_datetime(item.get("startDate"))
        end, est_end = parse_faa_datetime(item.get("endDate"))
        state = notam_state(start, end, now)
        if state == "expired" or item.get("cancelledOrExpired") is True:
            continue

        raw_end = str(item.get("endDate") or "").strip()
        category, closed_rwys, ad_closed = classify_notam(raw_text)
        parsed.append({
            "id": item.get("notamNumber"),
            "category": category,
            "closed_runways": list(closed_rwys),
            "aerodrome_closed": ad_closed,
            "raw": raw_text,
            "state": state,
            "start_time": _fmt(start) if start else (item.get("startDate") or "Unknown"),
            "end_time": _fmt(end, est_end) if end else (
                "PERM" if raw_end.upper().startswith("PERM") else (raw_end or "Unknown")),
            "start_iso": start.isoformat() if start else None,
            "end_iso": end.isoformat() if end else None,
            "estimated_end": est_end,
        })

    # 現行有效的排前面，再依嚴重度排序
    parsed.sort(key=lambda x: (STATE_RANK.get(x["state"], 9), SORT_ORDER.get(x["category"], 99)))
    return parsed


def summarize_closures(notams):
    """把「現行有效」(active / unknown) NOTAM 的關閉資訊彙整給前端做跑道推薦。
    尚未生效 (upcoming) 的不計入，避免未來的關閉影響現在的推薦。"""
    closed, ids, ad = set(), [], False
    for n in notams or []:
        if n.get("state") not in ("active", "unknown"):
            continue
        if n.get("aerodrome_closed"):
            ad = True
            ids.append(n.get("id"))
        if n.get("category") in (CAT_RWY_CLOSED,) and (n.get("closed_runways") or []):
            closed.update(n["closed_runways"])
            ids.append(n.get("id"))
        elif n.get("category") == CAT_RWY_CLOSED:
            ids.append(n.get("id"))
    return {"aerodrome_closed": ad, "closed_runways": sorted(closed),
            "notam_ids": [i for i in dict.fromkeys(ids) if i]}
