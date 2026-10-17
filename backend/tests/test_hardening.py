"""快取上限 / 負快取 / in-flight 去重 / 限流 / CORS / 跑道估算標記。"""
import asyncio

import pytest
from fastapi.testclient import TestClient

import main
from ratelimit import RateLimiter
from tests.test_backend_api import FakeResp, make_client


def run(c):
    return asyncio.run(c)


# ---------------- 快取 ----------------
def test_cache_is_bounded(monkeypatch):
    monkeypatch.setattr(main, "CACHE_MAX_ENTRIES", 50)
    for i in range(500):
        main.cache_set(f"k{i}", i, 600)
    assert len(main._cache) <= 50
    assert main.cache_get("k499") == 499, "最新寫入的要保留"
    assert main.cache_get("k0") is None, "最舊的要被丟掉"


def test_expired_entries_are_purged_before_live_ones(monkeypatch):
    monkeypatch.setattr(main, "CACHE_MAX_ENTRIES", 10)
    for i in range(8):
        main.cache_set(f"dead{i}", i, -1)  # 已過期
    main.cache_set("live", 1, 600)
    for i in range(5):
        main.cache_set(f"new{i}", i, 600)
    assert main.cache_get("live") == 1


def test_rewriting_a_key_marks_it_newest(monkeypatch):
    monkeypatch.setattr(main, "CACHE_MAX_ENTRIES", 5)
    main.cache_set("a", 1, 600)
    for i in range(4):
        main.cache_set(f"x{i}", i, 600)
    main.cache_set("a", 2, 600)  # 重新寫入 a
    main.cache_set("y", 0, 600)  # 觸發淘汰
    assert main.cache_get("a") == 2


# ---------------- 負快取 ----------------
def test_avwx_4xx_is_negatively_cached_but_not_exceptions(monkeypatch):
    seen = []
    monkeypatch.setattr(main.httpx, "AsyncClient", make_client("metar_404", seen))
    assert "error" in run(main.get_weather("ZZZZ"))
    n = len([u for u in seen if "metar" in u])
    assert "error" in run(main.get_weather("ZZZZ"))
    assert len([u for u in seen if "metar" in u]) == n, "不存在的 ICAO 不該每次都打 AVWX"


# ---------------- in-flight 去重 ----------------
def test_concurrent_identical_requests_share_one_upstream_call():
    calls = []

    async def slow():
        calls.append(1)
        await asyncio.sleep(0.05)
        return FakeResp(200, {"ok": True})

    async def go():
        return await asyncio.gather(*(main.fetch_json("same", 60, slow) for _ in range(10)))

    results = run(go())
    assert len(calls) == 1
    assert all(r == ({"ok": True}, None) for r in results)
    assert main._inflight == {}


def test_inflight_failure_is_shared_and_cleared():
    async def boom():
        await asyncio.sleep(0.01)
        raise RuntimeError("x")

    async def go():
        return await asyncio.gather(*(main.fetch_json("bad", 60, boom) for _ in range(3)))

    assert all(r == (None, "RuntimeError") for r in run(go()))
    assert main._inflight == {}


# ---------------- 限流 ----------------
def test_rate_limiter_window():
    rl = RateLimiter(limit=3, window=60)
    assert [rl.check("a", now=t)[0] for t in (0, 1, 2)] == [True] * 3
    ok, retry = rl.check("a", now=3)
    assert not ok and 1 <= retry <= 60
    assert rl.check("b", now=3)[0], "不同 client 互不影響"
    assert rl.check("a", now=61)[0], "視窗滑過後恢復"


def test_rate_limiter_disabled_and_bounded_keys():
    assert RateLimiter(0).check("x")[0]
    rl = RateLimiter(limit=5, window=60, max_keys=10)
    for i in range(100):
        rl.check(f"ip{i}", now=i * 0.001)
    assert len(rl._hits) <= 10


def test_middleware_returns_429_with_cors_and_retry_after(monkeypatch):
    monkeypatch.setattr(main, "rate_limiter", RateLimiter(2))
    c = TestClient(main.app)
    h = {"Origin": "http://localhost:5173"}
    body = {"action": "NOPE", "payload": {}}
    assert c.post("/api/gateway", json=body, headers=h).status_code == 400
    assert c.post("/api/gateway", json=body, headers=h).status_code == 400
    r = c.post("/api/gateway", json=body, headers=h)
    assert r.status_code == 429
    assert r.json()["success"] is False
    assert int(r.headers["retry-after"]) >= 1
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173", \
        "429 也要帶 CORS 標頭，前端才讀得到訊息"


def test_status_endpoint_is_not_rate_limited(monkeypatch):
    monkeypatch.setattr(main, "rate_limiter", RateLimiter(1))
    c = TestClient(main.app)
    assert all(c.get("/api/status").status_code == 200 for _ in range(5))


# ---------------- CORS ----------------
@pytest.mark.parametrize("origin,allowed", [
    ("http://localhost:5173", True),
    ("https://aerobrief.vercel.app", True),
    ("https://aerobrief-git-feat-x-user.vercel.app", True),
    ("https://evil.vercel.app", False),
    ("https://aerobrief.vercel.app.evil.com", False),
])
def test_cors_origins(origin, allowed):
    r = TestClient(main.app).options("/api/gateway", headers={
        "Origin": origin, "Access-Control-Request-Method": "POST"})
    assert (r.headers.get("access-control-allow-origin") == origin) is allowed


# ---------------- 跑道 approx / closures / fetched_at ----------------
class StationNoBearing(make_client("ok")):
    async def get(self, url, headers=None):
        if "station" in url:
            return FakeResp(200, {"runways": [{"ident1": "09", "ident2": "27", "bearing1": None, "bearing2": 270.4}]})
        return await super().get(url, headers)


def test_runways_flag_estimated_headings(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", StationNoBearing)
    out = run(main.get_weather("RCTP"))
    by = {r["name"]: r for r in out["runways"]}
    assert by["09"]["approx"] is True and by["09"]["heading"] == 90
    assert by["27"]["approx"] is False and by["27"]["heading"] == 270


class WithClosureNotam(make_client("ok")):
    async def post(self, url, headers=None, data=None):
        return FakeResp(200, {"notamList": [
            {"notamNumber": "A1", "icaoMessage": "E) RWY 05L/23R CLSD", "startDate": "01/01/2020 0000", "endDate": "PERM"},
            {"notamNumber": "A2", "icaoMessage": "E) AD CLSD", "startDate": "01/01/2099 0000", "endDate": "PERM"},
        ], "error": ""})


def test_gateway_exposes_closures_and_fetched_at(monkeypatch):
    monkeypatch.setattr(main.httpx, "AsyncClient", WithClosureNotam)
    main.vatsim_cache["data"] = {"controllers": [], "pilots": []}
    r = TestClient(main.app).post("/api/gateway", json={"action": "GET_FULL_BRIEFING", "payload": {"icao": "RCTP"}})
    d = r.json()["data"]
    assert d["closures"]["closed_runways"] == ["05L", "23R"]
    assert d["closures"]["aerodrome_closed"] is False, "未來才生效的機場關閉不該影響現在"
    assert isinstance(d["fetched_at"], int)
