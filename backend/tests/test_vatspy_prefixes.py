"""航管呼號前綴：澳洲 BN_TWR、美國 JFK_TWR 等不以 ICAO 開頭的呼號也要被抓到。"""
import asyncio

import main
import vatspy
from vatspy import callsign_prefixes, parse_vatspy_airports

SAMPLE = """[Countries]
Australia|YB|Centre
[Airports]
;ICAO|Airport Name|Latitude Decimal|Longitude Decimal|IATA/LID|FIR|IsPseudo
YBBN|Brisbane|-27.38|153.11|BN|YINL|0
YBBN|Brisbane|-27.38|153.11|BN-F|YINL|1
YBBN|Brisbane|-27.38|153.11|bn-n|YINL|1
KJFK|New York JFK|40.6|-73.7|JFK|KZNY|0
RCTP|Taipei|25.0|121.2|TPE|RCAA|0
EGLC|Thames|51.5|0.05||EGTT|1
XXXX|Same as icao|0|0|XXXX|AAAA|0
broken line
[FIRs]
YBBB|Brisbane Centre|||YBBB
"""


def run(c):
    return asyncio.run(c)


def ctl(callsign, facility=4, freq="118.000"):
    return {"callsign": callsign, "cid": hash(callsign) % 10**6, "frequency": freq,
            "name": "N", "facility": facility}


def set_controllers(*items):
    main.vatsim_cache["data"] = {"controllers": list(items), "pilots": []}


def names(icao):
    return [c["callsign"] for c in run(main.get_vatsim(icao))["controllers"]]


# ---------------- 解析 ----------------
def test_parse_extracts_prefixes_only_from_airports_section():
    d = parse_vatspy_airports(SAMPLE)
    assert d["YBBN"] == ["BN", "BN-F", "BN-N"]       # 大小寫統一、去重、排序
    assert d["KJFK"] == ["JFK"]
    assert "EGLC" not in d                            # 沒有前綴的不收
    assert "XXXX" not in d                            # 與 ICAO 相同的不重複收
    assert "YBBB" not in d                            # 其他區段不收


def test_parse_empty_or_garbage():
    assert parse_vatspy_airports("") == {}
    assert parse_vatspy_airports("no sections here") == {}


# ---------------- 隨附資料快照 ----------------
def test_bundled_snapshot_has_the_airports_that_motivated_it():
    assert {"BN", "BN-F"} <= callsign_prefixes("YBBN")
    assert "JFK" in callsign_prefixes("KJFK")
    assert {"ML", "SY"} <= callsign_prefixes("YMML") | callsign_prefixes("YSSY")


def test_icao_itself_is_always_a_prefix_even_for_unknown_airports():
    assert callsign_prefixes("rctp") >= {"RCTP"}
    assert callsign_prefixes("ZZZZ") == {"ZZZZ"}
    assert callsign_prefixes("") == {""}


def test_missing_data_file_degrades_to_icao_only(monkeypatch, tmp_path):
    monkeypatch.setattr(vatspy, "DATA_FILE", tmp_path / "nope.json")
    vatspy._load.cache_clear()
    try:
        assert callsign_prefixes("YBBN") == {"YBBN"}
    finally:
        vatspy._load.cache_clear()


def test_corrupt_data_file_degrades_to_icao_only(monkeypatch, tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text("{not json")
    monkeypatch.setattr(vatspy, "DATA_FILE", bad)
    vatspy._load.cache_clear()
    try:
        assert callsign_prefixes("YBBN") == {"YBBN"}
    finally:
        vatspy._load.cache_clear()


def test_bundled_snapshot_has_no_ambiguous_prefix():
    """同一個前綴不可對應到兩個機場，否則會把別的機場的航管顯示出來。"""
    seen = {}
    for icao, prefixes in vatspy._load().items():
        for p in prefixes:
            assert seen.setdefault(p, icao) == icao, f"前綴 {p} 同時屬於 {seen[p]} 與 {icao}"


# ---------------- get_vatsim 實際比對 ----------------
def test_REGRESSION_ybbn_controllers_with_bn_prefix_are_listed():
    set_controllers(ctl("BN_TWR", freq="120.500"), ctl("BN_GND"), ctl("BN_DEL"),
                    ctl("BN_APP", freq="124.700"), ctl("BN-F_APP"))
    got = names("YBBN")
    assert set(got) == {"BN_TWR", "BN_GND", "BN_DEL", "BN_APP", "BN-F_APP"}
    # 依 DEL → GND → TWR → APP 排序
    assert got.index("BN_DEL") < got.index("BN_GND") < got.index("BN_TWR") < got.index("BN_APP")


def test_ybbn_still_matches_icao_style_callsigns():
    set_controllers(ctl("YBBN_TWR"))
    assert names("YBBN") == ["YBBN_TWR"]


def test_regional_centre_and_other_airports_are_not_attached_to_ybbn():
    set_controllers(
        ctl("BN-DOS_CTR"), ctl("BN-TBP_CTR"),   # 區域管制中心（非機場）
        ctl("BNX_TWR"), ctl("BNE_TWR"),          # 前綴只是長得像
        ctl("ML_TWR"), ctl("SY_TWR"),            # 其他機場
        ctl("BN_OBS", facility=0),               # 觀察員
    )
    assert names("YBBN") == []


def test_us_airports_use_faa_style_prefix():
    set_controllers(ctl("JFK_TWR"), ctl("JFK_GND"), ctl("KJFK_APP"), ctl("LGA_TWR"), ctl("JFK_OBS", facility=0))
    assert set(names("KJFK")) == {"JFK_TWR", "JFK_GND", "KJFK_APP"}


def test_lookup_is_case_insensitive_and_multi_segment_callsigns_work():
    set_controllers(ctl("bn_twr"), ctl("BN_3_GND"))
    assert set(names("ybbn")) == {"bn_twr", "BN_3_GND"}


def test_existing_behaviour_unchanged_for_icao_airports():
    set_controllers(ctl("RCTP_TWR"), ctl("RCTPX_TWR"), ctl("RCTP_OBS", facility=0))
    assert names("RCTP") == ["RCTP_TWR"]


def test_gateway_end_to_end_for_ybbn():
    from fastapi.testclient import TestClient

    set_controllers(ctl("BN_TWR", freq="120.500"), ctl("BN_APP", freq="124.700"), ctl("BN-DOS_CTR"))
    r = TestClient(main.app).post("/api/gateway", json={"action": "GET_VATSIM", "payload": {"icao": "YBBN"}})
    assert r.status_code == 200
    ctrls = r.json()["data"]["controllers"]
    assert [(c["callsign"], c["frequency"]) for c in ctrls] == [("BN_TWR", "120.500"), ("BN_APP", "124.700")]
