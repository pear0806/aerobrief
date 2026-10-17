"""機場 ICAO → VATSIM 航管呼號前綴對照。

VATSIM 的航管呼號不一定以 ICAO 開頭：
  澳洲  BN_TWR / BN_GND / BN-F_APP   （YBBN）
  美國  JFK_TWR / LAX_GND            （KJFK / KLAX）
  加拿大 TOR_APP / YYZ_TWR           （CYYZ）
資料來源是官方社群維護的 VATSpy data（Airports 表第 5 欄 IATA/LID）。
快照放在 data/vatspy_prefixes.json，用 scripts/update_vatspy_prefixes.py 更新。
"""
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Dict, FrozenSet

log = logging.getLogger("aerobrief.vatspy")
DATA_FILE = Path(__file__).with_name("data") / "vatspy_prefixes.json"


def parse_vatspy_airports(text: str) -> Dict[str, list]:
    """解析 VATSpy.dat 的 [Airports] 區段 → {ICAO: [前綴, ...]}（不含與 ICAO 相同者）。
    欄位：ICAO|Name|Lat|Lon|IATA/LID|FIR|IsPseudo。pseudo=1 的是分區席位前綴（如 BN-F）。"""
    out: Dict[str, set] = {}
    in_airports = False
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("["):
            in_airports = line.lower() == "[airports]"
            continue
        if not in_airports or not line or line.startswith(";"):
            continue
        parts = line.split("|")
        if len(parts) < 5:
            continue
        icao, prefix = parts[0].strip().upper(), parts[4].strip().upper()
        if icao and prefix and prefix != icao:
            out.setdefault(icao, set()).add(prefix)
    return {k: sorted(v) for k, v in sorted(out.items())}


@lru_cache(maxsize=1)
def _load() -> Dict[str, FrozenSet[str]]:
    try:
        raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        log.warning("無法讀取 %s（%s）；僅以 ICAO 比對航管呼號", DATA_FILE, e)
        return {}
    return {k.upper(): frozenset(p.upper() for p in v) for k, v in raw.items()}


def callsign_prefixes(icao: str) -> FrozenSet[str]:
    """該機場所有可能的航管呼號第一段（一定包含 ICAO 本身）。"""
    icao = (icao or "").strip().upper()
    return frozenset({icao}) | _load().get(icao, frozenset())
