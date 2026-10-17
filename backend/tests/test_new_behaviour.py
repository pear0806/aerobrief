import asyncio

import pytest
from fastapi.testclient import TestClient

import main
from tests.test_backend_api import make_client


def run(c):
    return asyncio.run(c)


@pytest.mark.parametrize("raw,expected", [
    ("FL350", 35000), ("F350", 35000), ("A050", 5000), ("35000", 35000),
    ("5000", 5000), ("350", 35000), ("", None), (None, None), ("abc", None),
])
def test_parse_altitude(raw, expected):
    assert main.parse_altitude(raw) == expected


def test_runway_heading_fallback_from_ident():
    assert main.runway_heading("09", None) == 90
    assert main.runway_heading("36", None) == 0
    assert main.runway_heading("05L", 52.4) == 52
    assert main.runway_heading("XX", None) is None


def test_weather_degrades_with_warnings(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("notam_exc"))
    out = run(main.get_weather("RCTP"))
    assert any("NOTAM" in w for w in out["warnings"])


def test_weather_is_cached(monkeypatch):
    seen = []
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok", seen))
    run(main.get_weather("RCTP"))
    n = len(seen)
    run(main.get_weather("RCTP"))
    assert len(seen) == n, "第二次呼叫應命中快取，不再打外部 API"


def test_transient_failures_are_not_cached(monkeypatch):
    """逾時 / 連線錯誤等暫時性失敗不記，下一次請求可以立即重試。"""
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_exc"))
    assert "error" in run(main.get_weather("RCTP"))
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    assert "error" not in run(main.get_weather("RCTP"))


def test_gateway_get_vatsim_action_is_light(monkeypatch):
    seen = []
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok", seen))
    main.vatsim_cache["data"] = {"controllers": [], "pilots": []}
    r = TestClient(main.app).post("/api/gateway", json={"action": "GET_VATSIM", "payload": {"icao": "rctp"}})
    assert r.json()["success"] is True
    assert seen == []


def test_gateway_full_briefing_shape(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    main.vatsim_cache["data"] = {"controllers": [], "pilots": []}
    r = TestClient(main.app).post("/api/gateway", json={"action": "GET_FULL_BRIEFING", "payload": {"icao": "rctp"}})
    d = r.json()["data"]
    assert d["icao"] == "RCTP" and d["runways"][0]["heading"] == 52 and d["warnings"] == []


def test_weather_endpoint_status_codes(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_404"))
    c = TestClient(main.app)
    assert c.get("/api/weather/RCTP").status_code == 502
    assert c.get("/api/weather/BAD!").status_code == 400


def test_vatsim_excludes_observers_and_supports_multipart_callsigns():
    main.vatsim_cache["data"] = {"pilots": [], "controllers": [
        {"callsign": "WSSS_3_GND", "facility": 3, "frequency": "121.6", "name": "a"},
        {"callsign": "WSSS_OBS", "facility": 0, "frequency": "199.998", "name": "b"},
        {"callsign": "WSSS_TWR", "facility": 4, "frequency": "118.6", "name": "c"},
        {"callsign": "AAL914", "facility": 0, "frequency": "199.998", "name": "d"},
    ]}
    r = run(main.get_vatsim("WSSS"))
    assert [c["callsign"] for c in r["controllers"]] == ["WSSS_3_GND", "WSSS_TWR"]


def test_failed_notam_is_negatively_cached_but_metar_is_not(monkeypatch):
    seen = []
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("notam_exc", seen))
    run(main.get_weather("RCTP"))
    n_first = len([u for u in seen])
    posts = []

    class Spy(make_client("notam_exc", seen)):
        async def post(self, *a, **k):
            posts.append(1)
            return await super().post(*a, **k)

    monkeypatch.setattr(main.httpx, "AsyncClient", Spy)
    out = run(main.get_weather("RCTP"))
    assert posts == [], "FAA 剛失敗，5 分鐘內不應再撞一次"
    assert any("NOTAM" in w for w in out["warnings"])
    assert n_first > 0


def test_runway_bearings_from_real_avwx_station_payload():
    # 取自真實 AVWX：RCTP 05L bearing=49.3（真北），ZBAA ident=01 bearing=353.0
    assert main.runway_heading("05L", 49.3) == 49
    assert main.runway_heading("01", 353.0) == 353


# ---------------- FAA 請求形式與分頁 ----------------
class PagedFaa(make_client("ok")):
    calls = []

    def __init__(self, *a, **k):
        super().__init__(*a, **k)

    async def post(self, url, headers=None, data=None):
        from tests.test_backend_api import FakeResp
        PagedFaa.calls.append((headers, dict(data)))
        off = data["offset"]
        page = [{"notamNumber": f"A{i}", "icaoMessage": "RWY 05 CLSD"} for i in range(off, min(off + 30, 70))]
        return FakeResp(200, {"notamList": page, "totalNotamCount": 70})


def test_faa_request_uses_browser_headers_and_full_form(monkeypatch):
    PagedFaa.calls = []
    monkeypatch.setattr(main.httpx, "AsyncClient", PagedFaa)
    run(main.get_weather("RCTP"))
    headers, form = PagedFaa.calls[0]
    assert "Chrome" in headers["User-Agent"] and headers["Origin"].startswith("https://notams.aim.faa.gov")
    assert headers["Referer"] and form["formatType"] == "ICAO" and form["designatorsForLocation"] == "RCTP"


def test_faa_pagination_collects_all_pages(monkeypatch):
    PagedFaa.calls = []
    monkeypatch.setattr(main.httpx, "AsyncClient", PagedFaa)
    out = run(main.get_weather("RCTP"))
    assert len(out["notam"]) == 70
    assert [c[1]["offset"] for c in PagedFaa.calls] == [0, 30, 60]
    assert out["warnings"] == []


def test_faa_truncation_is_reported(monkeypatch):
    monkeypatch.setattr(main, "FAA_MAX_PAGES", 1)
    PagedFaa.calls = []
    monkeypatch.setattr(main.httpx, "AsyncClient", PagedFaa)
    out = run(main.get_weather("RCTP"))
    assert len(out["notam"]) == 30
    assert any("不完整" in w and "70" in w for w in out["warnings"])


def test_faa_full_page_without_total_is_flagged_as_possibly_incomplete(monkeypatch):
    class NoTotal(PagedFaa):
        async def post(self, url, headers=None, data=None):
            from tests.test_backend_api import FakeResp
            return FakeResp(200, {"notamList": [{"notamNumber": f"N{i}", "icaoMessage": "X"} for i in range(30)]})
    monkeypatch.setattr(main.httpx, "AsyncClient", NoTotal)
    out = run(main.get_weather("RCTP"))
    assert any("不完整" in w for w in out["warnings"])


def test_faa_error_field_is_treated_as_failure(monkeypatch):
    class Err(make_client("ok")):
        async def post(self, url, headers=None, data=None):
            from tests.test_backend_api import FakeResp
            return FakeResp(200, {"notamList": [], "error": "Service unavailable"})
    monkeypatch.setattr(main.httpx, "AsyncClient", Err)
    out = run(main.get_weather("RCTP"))
    assert out["notam"] == [] and any("NOTAM" in w for w in out["warnings"])


def test_faa_pages_are_fetched_concurrently_and_deduped(monkeypatch):
    PagedFaa.calls = []
    monkeypatch.setattr(main.httpx, "AsyncClient", PagedFaa)
    out = run(main.get_weather("RCTP"))
    ids = [n["id"] for n in out["notam"]]
    assert len(ids) == len(set(ids)) == 70
