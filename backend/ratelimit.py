"""極簡的記憶體內滑動視窗限流（每個 client 一個 deque）。

單程序有效；多 worker 部署時每個 worker 各自計數（上限會被放大），
需要嚴格限流請改用反向代理 / Redis。
"""
import time
from collections import deque
from typing import Deque, Dict, Optional, Tuple


class RateLimiter:
    def __init__(self, limit: int, window: float = 60.0, max_keys: int = 10_000):
        self.limit, self.window, self.max_keys = limit, window, max_keys
        self._hits: Dict[str, Deque[float]] = {}

    def check(self, key: str, now: Optional[float] = None) -> Tuple[bool, int]:
        """回傳 (是否放行, 需等待秒數)。limit<=0 代表停用。"""
        if self.limit <= 0:
            return True, 0
        now = time.monotonic() if now is None else now
        q = self._hits.get(key)
        if q is None:
            if len(self._hits) >= self.max_keys:
                self._purge(now)
            q = self._hits[key] = deque()
        cutoff = now - self.window
        while q and q[0] <= cutoff:
            q.popleft()
        if len(q) >= self.limit:
            return False, max(1, int(q[0] + self.window - now) + 1)
        q.append(now)
        return True, 0

    def _purge(self, now: float):
        cutoff = now - self.window
        for k in [k for k, q in self._hits.items() if not q or q[-1] <= cutoff]:
            del self._hits[k]
        if len(self._hits) >= self.max_keys:  # 全是活躍 key：丟掉最舊的一半
            for k in list(self._hits)[: self.max_keys // 2]:
                del self._hits[k]
