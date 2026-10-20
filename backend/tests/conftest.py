import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("AVWX_TOKEN", "test-token")


import pytest  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_cache():
    import main
    main._cache.clear()
    main._inflight.clear()
    main.rate_limiter._hits.clear()
    main._http_client = None
    main.upstream_health.clear()
    yield
    main._cache.clear()
    main._inflight.clear()
    main.rate_limiter._hits.clear()
