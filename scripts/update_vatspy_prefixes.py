#!/usr/bin/env python3
"""從 VATSpy data 重新產生 backend/data/vatspy_prefixes.json。

用法：python scripts/update_vatspy_prefixes.py
機場的呼號前綴很少變動，建議每隔數月或遇到「某機場有航管在線卻沒顯示」時更新一次。
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
from vatspy import DATA_FILE, parse_vatspy_airports  # noqa: E402

URL = "https://raw.githubusercontent.com/vatsimnetwork/vatspy-data-project/master/VATSpy.dat"


def main():
    with urllib.request.urlopen(URL, timeout=30) as r:
        text = r.read().decode("utf-8", errors="replace")
    data = parse_vatspy_airports(text)
    if len(data) < 1000:  # 防呆：來源改版時不要把資料檔覆蓋成空殼
        sys.exit(f"解析結果只有 {len(data)} 個機場，疑似來源格式改變，已中止。")
    DATA_FILE.parent.mkdir(exist_ok=True)
    DATA_FILE.write_text(
        json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"寫入 {DATA_FILE}：{len(data)} 個機場、{sum(map(len, data.values()))} 個前綴")


if __name__ == "__main__":
    main()
