import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

import main


class FakeResp:
    def __init__(self, code=200, js=None, text=""):
        self.status_code, self._js, self.text = code, js, text

    def json(self):
        return self._js


def make_client(mode="ok", seen=None):
    class FakeClient:
        def __init__(self, *a, **k): ...
        async def __aenter__(self): return self
        async def __aexit__(self, *a): ...

        async def get(self, url, headers=None):
            if seen is not None:
                seen.append(url)
            if "metar" in url:
                if mode == "metar_exc":
                    raise httpx.ConnectTimeout("boom")
                if mode == "metar_404":
                    return FakeResp(404, text="not found")
                return FakeResp(200, {"wind_speed": {"value": 10}, "wind_direction": {"value": 90}})
            if "station" in url:
                return FakeResp(200, {"elevation_ft": 100, "runways": [
                    {"ident1": "05L", "bearing1": 52.3, "ident2": "23R", "bearing2": 232.3}]})
            if "taf" in url:
                return FakeResp(200, {"raw": "TAF X"})
            return FakeResp(404)

        async def post(self, url, headers=None, data=None):
            if mode == "notam_exc":
                raise httpx.ConnectTimeout("faa down")
            return FakeResp(200, {"notamList": []})
    return FakeClient


def run(coro):
    return asyncio.run(coro)


# ---------------- weather ----------------
def test_weather_happy_path(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    out = run(main.get_weather("RCTP"))
    assert out["common"]["wind_speed"]["value"] == 10
    assert [r["name"] for r in out["runways"]] == ["05L", "23R"]


def test_bug_metar_timeout_returns_error_dict_not_exception(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_exc"))
    out = run(main.get_weather("RCTP"))
    assert "error" in out


def test_bug_metar_404_returns_error_not_typeerror(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_404"))
    out = run(main.get_weather("RCTP"))
    assert "error" in out


def test_bug_faa_notam_failure_should_not_break_weather(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("notam_exc"))
    out = run(main.get_weather("RCTP"))
    assert out.get("common") is not None
    assert out.get("notam") == []


# ---------------- gateway / validation ----------------
def test_gateway_missing_icao():
    r = TestClient(main.app).post("/api/gateway", json={"action": "GET_FULL_BRIEFING", "payload": {}})
    assert r.json()["success"] is False


def test_gateway_unknown_action():
    r = TestClient(main.app).post("/api/gateway", json={"action": "NOPE", "payload": {}})
    assert r.json()["success"] is False


@pytest.mark.parametrize("bad", ["RCTP/../../account", "RC TP", "R", "RCTPX", "RC?P", "中文機場"])
def test_bug_icao_input_validation(monkeypatch, bad):
    seen = []
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok", seen))
    main.vatsim_cache["data"] = {"controllers": [], "pilots": []}
    r = TestClient(main.app).post("/api/gateway", json={"action": "GET_FULL_BRIEFING", "payload": {"icao": bad}})
    assert r.json()["success"] is False
    assert seen == [], f"不合法 ICAO 不應該發出外部請求，但發了: {seen}"


def test_bug_http_status_codes_are_semantic():
    # 目前所有錯誤都回 200 + success:false；這裡記錄現況，方便之後決定是否改為 4xx/5xx
    r = TestClient(main.app).post("/api/gateway", json={"action": "NOPE", "payload": {}})
    assert r.status_code in (400, 404, 422)


# ---------------- vatsim ----------------
@pytest.fixture
def vatsim_data():
    main.vatsim_cache["data"] = {
        "controllers": [
            {"callsign": "RCTP_TWR", "frequency": "118.100", "name": "A"},
            {"callsign": "RCTP_APP", "frequency": "119.700", "name": "B"},
            {"callsign": "RCTP_DEL", "frequency": "121.900", "name": "C"},
            {"callsign": "RCTPX_FOO", "frequency": "1", "name": "D"},
        ],
        "pilots": [
            {"callsign": "CAL1", "altitude": 35000, "groundspeed": 450,
             "flight_plan": {"departure": "RCTP", "arrival": "RJTT", "altitude": "FL350"}},
            {"callsign": "CAL2", "altitude": 35000,
             "flight_plan": {"departure": "VHHH", "arrival": "RJTT", "altitude": "FL350"}},
            {"callsign": "NOFP", "altitude": 100, "flight_plan": None},
        ],
    }
    yield
    main.vatsim_cache["data"] = None


def test_vatsim_not_ready():
    main.vatsim_cache["data"] = None
    assert "error" in run(main.get_vatsim("RCTP"))


def test_vatsim_controller_order(vatsim_data):
    r = run(main.get_vatsim("rctp"))
    suffixes = [c["callsign"].split("_")[-1] for c in r["controllers"]]
    assert suffixes.index("DEL") < suffixes.index("TWR") < suffixes.index("APP")


def test_bug_vatsim_controller_prefix_overmatch(vatsim_data):
    r = run(main.get_vatsim("RCTP"))
    assert "RCTPX_FOO" not in [c["callsign"] for c in r["controllers"]]


def test_vatsim_departures_arrivals(vatsim_data):
    r = run(main.get_vatsim("RCTP"))
    assert [p["callsign"] for p in r["departures"]] == ["CAL1"]


def test_bug_fl350_is_35000_feet(vatsim_data):
    r = run(main.get_vatsim("RCTP"))
    assert "CAL1" in [p["callsign"] for p in r["cruisings"]], \
        "FL350 應為 35,000ft；目前被乘以 1000 變成 350,000ft，導致永遠不會被判定為巡航"


def test_bug_cruising_includes_overflights_not_only_dep_arr(vatsim_data):
    r = run(main.get_vatsim("RCTP"))
    # CAL2 (VHHH→RJTT) 沒有經過/出發/抵達 RCTP，本來就不該出現；此測試保護未來加入「過境」邏輯時的誤判
    assert "CAL2" not in [p["callsign"] for p in r["cruisings"]]
