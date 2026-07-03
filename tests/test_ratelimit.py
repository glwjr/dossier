import pytest
from fastapi import HTTPException, Request

from app.ratelimit import FixedWindowRateLimiter


def _request(xff: str | None = None, client_host: str = "203.0.113.9") -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff else []
    return Request({"type": "http", "headers": headers, "client": (client_host, 12345)})


# --- _client_ip: the limiter key must not be client-controlled ---


def test_client_ip_falls_back_to_socket_peer():
    assert FixedWindowRateLimiter._client_ip(_request()) == "203.0.113.9"


def test_client_ip_uses_forwarded_header_when_present():
    assert FixedWindowRateLimiter._client_ip(_request("198.51.100.7")) == "198.51.100.7"


def test_client_ip_uses_rightmost_forwarded_hop():
    # The rightmost entry is appended by our own proxy (Render) and is the
    # only one the client can't choose; anything left of it is spoofable.
    req = _request("6.6.6.6, 7.7.7.7, 198.51.100.7")
    assert FixedWindowRateLimiter._client_ip(req) == "198.51.100.7"


# --- spoofed prefixes must not escape the limit ---


def test_spoofed_forwarded_prefix_shares_one_bucket():
    limiter = FixedWindowRateLimiter(window_seconds=60)
    limiter.check(_request("1.1.1.1, 198.51.100.7"), limit=1)
    with pytest.raises(HTTPException) as exc:
        limiter.check(_request("2.2.2.2, 198.51.100.7"), limit=1)
    assert exc.value.status_code == 429


def test_distinct_real_clients_get_distinct_buckets():
    limiter = FixedWindowRateLimiter(window_seconds=60)
    limiter.check(_request("198.51.100.7"), limit=1)
    # A different actual client is not throttled by the first one's traffic.
    limiter.check(_request("198.51.100.8"), limit=1)
