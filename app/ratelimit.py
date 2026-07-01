"""Minimal in-process rate limiting.

Fixed-window, per-client-IP, dependency-free. State lives in this process and
resets on restart — appropriate for the single-instance deployment; it is NOT
shared across replicas. Used to bound abuse of POST /auth/demo.
"""

import threading
import time

from fastapi import HTTPException, Request, status

from app.config import settings


class FixedWindowRateLimiter:
    def __init__(self, window_seconds: int = 60):
        self._window = window_seconds
        self._lock = threading.Lock()
        # key -> (window_start_monotonic, count_in_window)
        self._hits: dict[str, tuple[float, int]] = {}

    @staticmethod
    def _client_ip(request: Request) -> str:
        # Leftmost X-Forwarded-For hop (Render sets this). Spoofable, but the
        # failure mode is a bypass (a fake IP gets its own bucket), never a
        # global lockout — which taking a trusted-proxy value could cause.
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def check(self, request: Request, limit: int) -> None:
        if limit <= 0:
            return  # limiting disabled
        now = time.monotonic()
        key = self._client_ip(request)
        with self._lock:
            start, count = self._hits.get(key, (now, 0))
            if now - start >= self._window:
                start, count = now, 0
            count += 1
            self._hits[key] = (start, count)
            # Opportunistic sweep so abandoned keys don't grow unbounded.
            if len(self._hits) > 10_000:
                self._hits = {
                    k: v for k, v in self._hits.items() if now - v[0] < self._window
                }
            over_limit = count > limit
            retry_after = max(1, int(self._window - (now - start)))
        if over_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests — please try again shortly.",
                headers={"Retry-After": str(retry_after)},
            )


demo_limiter = FixedWindowRateLimiter(window_seconds=60)


def rate_limit_demo(request: Request) -> None:
    """Route dependency: throttle POST /auth/demo per client IP."""
    demo_limiter.check(request, limit=settings.demo_rate_limit_per_minute)
