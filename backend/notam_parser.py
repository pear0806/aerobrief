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
from datetime import datetime, timezone

_RWY = re.compile(r"\b(?:RWY|RUNWAY)\b")
_TWY = re.compile(r"\b(?:TWY|TAXIWAY)\b")
_NAV = re.compile(
    r"\b(?:ILS|LLZ|VOR|DME|NDB|TACAN|VORTAC|RNAV|NAV|PAPI|VASI|ALS)\b")
_WORK = re.compile(
    r"\b(?:WIP|WORK IN PROGRESS|CRANES?|OBST|OBSTACLES?|OBSTRUCTION|CONSTRUCTION)\b")
_AIRSPACE = re.compile(
    r"\b(?:UNMANNED|DRONES?|UAS|UAV|FIREWORKS|ROCKETS?|LASER|PARACHUTE|BALLOONS?)\b")
_CLSD = re.compile(r"\b(?:CLSD|CLOSED)\b")
_PARKING_ONLY = re.compile(r"\s*(?:FOR|TO)\s+(?:ACFT\s+)?(?:PRKG|PARKING|STANDS?|TOWING)\b")

CAT_RWY_CLOSED = "🚨 跑道關閉"
CAT_TWY_CLOSED = "🚧 滑行道關閉"
CAT_RWY = "🛫 跑道資訊"
CAT_NAV = "📡 導航設施"
CAT_AIRSPACE = "⚠️ 空域活動（無人機／煙火等）"
CAT_WORK = "🏗️ 施工與障礙物"
CAT_TWY = "🚕 滑行道資訊"
CAT_GENERAL = "📝 一般資訊"

SORT_ORDER = {
    CAT_RWY_CLOSED: 0, CAT_TWY_CLOSED: 1, CAT_RWY: 2, CAT_NAV: 3,
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


def _closure_kind(text: str):
    """回傳 'rwy' / 'twy' / None。跑道優先；導航設施在前（ILS RWY 05L CLSD）不算跑道關閉。"""
    found_twy = False
    for clause in _CLAUSE_SPLIT.split(text):
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
                return "rwy"
            if twy and not (nav and nav.start() < twy.start()):
                found_twy = True
    return "twy" if found_twy else None


def categorize_notam(raw_text: str) -> str:
    text = _body(raw_text or "")

    closure = _closure_kind(text)
    if closure == "rwy":
        return CAT_RWY_CLOSED
    if closure == "twy":
        return CAT_TWY_CLOSED

    hits = {}
    for name, rx in (("nav", _NAV), ("air", _AIRSPACE), ("work", _WORK),
                     ("rwy", _RWY), ("twy", _TWY)):
        m = rx.search(text)
        if m:
            hits[name] = m.start()
    if not hits:
        return CAT_GENERAL

    subject = min(hits, key=hits.get)
    return {
        "nav": CAT_NAV, "air": CAT_AIRSPACE, "work": CAT_WORK,
        "rwy": CAT_RWY, "twy": CAT_TWY,
    }[subject]


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
        parsed.append({
            "id": item.get("notamNumber"),
            "category": categorize_notam(raw_text),
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
