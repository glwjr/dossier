import pytest

from app.config import _DEFAULT_SECRET_KEY, Settings


def test_prod_with_default_secret_key_raises():
    # frontend_url set (deployed) + default secret key must fail fast.
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(
            frontend_url="https://my.example.com",
            secret_key=_DEFAULT_SECRET_KEY,
        )


def test_prod_with_custom_secret_key_ok():
    s = Settings(frontend_url="https://my.example.com", secret_key="a-real-secret")
    assert s.secret_key == "a-real-secret"


def test_dev_with_default_secret_key_ok():
    s = Settings(frontend_url="", secret_key=_DEFAULT_SECRET_KEY)
    assert s.secret_key == _DEFAULT_SECRET_KEY


def test_demo_ttl_below_token_lifetime_raises():
    # A TTL shorter than the token lifetime would GC a live session's account.
    with pytest.raises(ValueError, match="DEMO_TTL_HOURS"):
        Settings(access_token_expire_minutes=60 * 24 * 7, demo_ttl_hours=1)


def test_demo_ttl_at_or_above_token_lifetime_ok():
    s = Settings(access_token_expire_minutes=60 * 24, demo_ttl_hours=24)
    assert s.demo_ttl_hours == 24
