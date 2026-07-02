import app.main as main
from app.config import settings


def test_init_sentry_noop_without_dsn(monkeypatch):
    monkeypatch.setattr(settings, "sentry_dsn", "")
    # Fail loudly if init is attempted with no DSN configured.
    monkeypatch.setattr(
        main.sentry_sdk,
        "init",
        lambda **kw: (_ for _ in ()).throw(AssertionError("should not init")),
    )
    assert main.init_sentry() is False


def test_init_sentry_enabled_with_dsn(monkeypatch):
    captured: dict = {}
    monkeypatch.setattr(settings, "sentry_dsn", "https://k@o0.ingest.sentry.io/1")
    monkeypatch.setattr(settings, "frontend_url", "https://my.example.com")
    monkeypatch.setattr(main.sentry_sdk, "init", lambda **kw: captured.update(kw))

    assert main.init_sentry() is True
    assert captured["dsn"] == "https://k@o0.ingest.sentry.io/1"
    assert captured["environment"] == "production"
    assert captured["send_default_pii"] is False
