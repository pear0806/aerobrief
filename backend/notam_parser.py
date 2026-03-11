def categorize_notam(raw_text: str) -> str:
    text = raw_text.upper()
    if "RWY" in text or "RUNWAY" in text:
        if "CLSD" in text or "CLOSED" in text:
            return "🚨 跑道關閉"
        return "🛫 跑道資訊"
    elif any(kw in text for kw in ["ILS", "VOR", "NDB", "NAV"]):
        return "📡 導航設施"
    elif "TWY" in text or "TAXIWAY" in text:
        if "CLSD" in text or "CLOSED" in text:
            return "🚧 滑行道關閉"
        return "🚕 滑行道資訊"
    elif "WIP" in text or "WORK IN PROGRESS" in text or "CRANE" in text:
        return "🏗️ 施工與障礙物"
    else:
        return "📝 一般資訊"


def process_notams(notam):
    if not notam or "notamList" not in notam:
        return []

    parsed_notams = []

    for item in notam.get("notamList", []):
        raw_text = item.get("icaoMessage", "")
        if not raw_text.strip():
            raw_text = item.get("traditionalMessageFrom4thWord", "")
        if not raw_text.strip():
            continue

        start_time = item.get("startDate", "Unknown")
        end_time = item.get("endDate", "Unknown")

        parsed_notams.append({
            "category": categorize_notam(raw_text),
            "raw": raw_text,
            "start_time": start_time,
            "end_time": end_time
        })

    sort_order = {"🚨 跑道關閉": 0, "🚧 滑行道關閉": 1, "🛫 跑道資訊": 2,
                  "📡 導航設施": 3, "🏗️ 施工與障礙物": 4, "🚕 滑行道資訊": 5, "📝 一般資訊": 6}
    parsed_notams.sort(key=lambda x: sort_order.get(x["category"], 99))

    return parsed_notams
