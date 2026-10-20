"""stale-if-error / 共用 HTTP client / GZip / 可觀測性 / NOTAM 分類快取。"""
import asyncio
import logging
import time

import pytest
from fastapi.testclient import TestClient

import main
import notam_parser
from tests.test_backend_api import FakeResp, make_client


def run(c):
    return asyncio.run(c)


def expire_all(stale_left=True):
    """讓所有快取項目「已過期」；stale_left=False 連寬限期也過掉。"""
    now = time.monotonic()
    for e in main._cache.values():
        grace = e.stale_until - e.exp  # 保留原本設定的寬限期長度
        e.exp = now - 1
        e.stale_until = now - 1 + (grace if stale_left else 0)


def n_calls(seen, needle):
    return len([u for u in seen if needle in u])


# ---------------- stale-if-error ----------------
def test_upstream_outage_serves_stale_data_with_a_warning(monkeypatch):
    seen = []
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok", seen))
    assert "error" not in run(main.get_weather("RCTP"))

    expire_all()  # 快取過期，AVWX 此時故障
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_exc", seen))
    out = run(main.get_weather("RCTP"))

    assert "error" not in out, "有舊資料就不該整頁報錯"
    assert out["common"]["wind_speed"]["value"] == 10
    assert any("METAR" in w and "快取" in w for w in out["warnings"])


def test_after_serving_stale_upstream_is_not_hammered_for_a_while(monkeypatch):
    seen = []
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok", seen))
    run(main.get_weather("RCTP"))
    expire_all()
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_exc", seen))
    run(main.get_weather("RCTP"))
    before = n_calls(seen, "metar")
    for _ in range(5):
        out = run(main.get_weather("RCTP"))
        assert any("快取" in w for w in out["warnings"]), "退避期間仍要標示是舊資料"
    assert n_calls(seen, "metar") == before, "退避期間不該每個請求都等上游逾時"


def test_recovers_to_fresh_data_when_upstream_returns(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    run(main.get_weather("RCTP"))
    expire_all()
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_exc"))
    run(main.get_weather("RCTP"))
    expire_all()  # 退避期結束
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    out = run(main.get_weather("RCTP"))
    assert not any("快取" in w for w in out["warnings"])


def test_stale_data_is_not_served_past_the_grace_period(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    run(main.get_weather("RCTP"))
    expire_all(stale_left=False)
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_exc"))
    assert "error" in run(main.get_weather("RCTP"))


def test_client_errors_never_fall_back_to_stale(monkeypatch):
    """4xx（例如 ICAO 不存在）是明確答案，不是暫時性故障，不能用舊資料掩蓋。"""
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    run(main.get_weather("RCTP"))
    expire_all()
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_404"))
    assert "error" in run(main.get_weather("RCTP"))


@pytest.mark.parametrize("status", [429, 500, 503])
def test_5xx_and_429_count_as_transient(status):
    async def ok():
        return FakeResp(200, {"v": 1})

    async def bad():
        return FakeResp(status)

    async def go():
        assert (await main.fetch_json_ex("k", 60, ok, stale_ttl=600))[0] == {"v": 1}
        expire_all()
        return await main.fetch_json_ex("k", 60, bad, stale_ttl=600)

    data, err, age = run(go())
    assert data == {"v": 1} and err is None and age is not None and age >= 0


def test_stale_disabled_by_default_keeps_old_behaviour():
    async def ok():
        return FakeResp(200, {"v": 1})

    async def bad():
        raise RuntimeError("x")

    async def go():
        await main.fetch_json("k2", 60, ok)
        expire_all()
        return await main.fetch_json("k2", 60, bad)

    assert run(go()) == (None, "RuntimeError")


def test_expired_but_in_grace_entries_survive_eviction_pressure(monkeypatch):
    monkeypatch.setattr(main, "CACHE_MAX_ENTRIES", 10)
    main.cache_set("keep", 1, -1, stale_ttl=600)   # 已過期但在寬限期
    main.cache_set("dead", 2, -1)                   # 已過期、無寬限
    for i in range(10):
        main.cache_set(f"n{i}", i, 600)
    assert "dead" not in main._cache
    assert main.cache_get("keep") is None, "過期的不算新鮮資料"


# ---------------- 共用 HTTP client ----------------
def test_http_client_is_shared_across_briefings(monkeypatch):
    created = []
    base = make_client("ok")

    class Counting(base):
        def __init__(self, *a, **k):
            created.append(1)
            super().__init__(*a, **k)

    monkeypatch.setattr(main.httpx, "AsyncClient", Counting)
    run(main.get_weather("RCTP"))
    main._cache.clear()
    run(main.get_weather("RJTT"))
    assert len(created) == 1, "不該每次簡報都新建 client（會重做 TLS 握手）"


def test_http_client_is_rebuilt_when_class_changes_or_closed(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    a = main.get_http_client()
    assert main.get_http_client() is a
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    assert main.get_http_client() is not a


def test_lifespan_closes_the_shared_client(monkeypatch):
    closed = []

    class Closable(make_client("ok")):
        async def aclose(self):
            closed.append(1)

    async def idle():
        await asyncio.sleep(3600)

    monkeypatch.setattr(main, "fetch_vatsim_data_loop", idle)
    monkeypatch.setattr(main.httpx, "AsyncClient", Closable)
    with TestClient(main.app) as c:
        assert c.get("/api/status").status_code == 200
        main.get_http_client()
    assert closed == [1]
    assert main._http_client is None


# ---------------- GZip / 回應標頭 ----------------
class ManyNotams(make_client("ok")):
    async def post(self, url, headers=None, data=None):
        return FakeResp(200, {"notamList": [
            {"notamNumber": f"A{i:04d}/26", "icaoMessage": f"E) AIP SUP {i} REFER TO AIP FOR DETAILS ON PROCEDURES",
             "startDate": "01/01/2020 0000", "endDate": "PERM"} for i in range(80)]})


def test_large_responses_are_gzipped_small_ones_are_not(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", ManyNotams)
    main.vatsim_cache["data"] = {"controllers": [], "pilots": []}
    c = TestClient(main.app)
    r = c.post("/api/gateway", json={"action": "GET_FULL_BRIEFING", "payload": {"icao": "RCTP"}},
               headers={"Accept-Encoding": "gzip"})
    assert r.status_code == 200 and r.headers.get("content-encoding") == "gzip"
    assert len(r.json()["data"]["notams"]) == 80, "壓縮不影響內容"
    small = c.get("/api/status", headers={"Accept-Encoding": "gzip"})
    assert small.headers.get("content-encoding") is None


def test_response_time_header_and_slow_request_log(monkeypatch, caplog):
    c = TestClient(main.app)
    r = c.post("/api/gateway", json={"action": "NOPE", "payload": {}})
    assert r.headers["x-response-time"].endswith("ms")
    monkeypatch.setattr(main, "SLOW_REQUEST_MS", 0)
    with caplog.at_level(logging.WARNING, logger="aerobrief"):
        c.post("/api/gateway", json={"action": "NOPE", "payload": {}})
    assert any("慢請求" in m for m in caplog.messages)


def test_json_content_type_and_unicode_survive_jsonresponse(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    main.vatsim_cache["data"] = {"controllers": [], "pilots": []}
    r = TestClient(main.app).post("/api/gateway", json={"action": "GET_FULL_BRIEFING", "payload": {"icao": "RCTP"}})
    assert r.headers["content-type"].startswith("application/json")
    assert r.json()["success"] is True


# ---------------- 可觀測性 ----------------
def test_status_reports_cache_vatsim_age_and_upstream_health(monkeypatch):
    c = TestClient(main.app)
    base = c.get("/api/status").json()
    assert base["status"] == "online" and base["version"] and base["uptime_s"] >= 0
    assert base["vatsim_data_age_s"] is None and base["cache_entries"] == 0

    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("ok"))
    run(main.get_weather("RCTP"))
    main.vatsim_cache["updated_at"] = time.time() - 7
    s = c.get("/api/status").json()
    assert s["cache_entries"] >= 4
    assert 6 <= s["vatsim_data_age_s"] <= 10
    assert s["upstreams"]["avwx"]["last_ok"] and s["upstreams"]["faa"]["last_ok"]

    expire_all()
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_exc"))
    run(main.get_weather("RCTP"))
    h = c.get("/api/status").json()["upstreams"]["avwx"]
    assert h["last_error"] and h["last_error_message"] == "ConnectTimeout"


# ---------------- NOTAM 分類快取 ----------------
def test_notam_classification_is_cached_across_requests():
    notam_parser.classify_notam.cache_clear()
    data = {"notamList": [{"notamNumber": f"A{i}", "icaoMessage": f"E) RWY 05L CLSD {i % 5}",
                           "startDate": "01/01/2020 0000", "endDate": "PERM"} for i in range(50)]}
    first = notam_parser.process_notams(data)
    info1 = notam_parser.classify_notam.cache_info()
    second = notam_parser.process_notams(data)
    info2 = notam_parser.classify_notam.cache_info()
    assert first == second
    assert info2.misses == info1.misses, "第二次請求不該再重新分類"
    assert info2.hits >= info1.hits + 50
    assert info1.misses <= 5 + 1, "只有 5 種不同文字，分類只該算 5 次"
