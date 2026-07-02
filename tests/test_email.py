from unittest.mock import MagicMock, patch

from app.config import settings
from app.email import send_email


def test_send_email_noop_without_config(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "")
    monkeypatch.setattr(settings, "reminder_from_email", "")
    # Fails loudly if it tries to make a request with no config.
    with patch("app.email.httpx.post") as post:
        assert send_email("to@example.com", "Hi", "<p>hi</p>") is False
        post.assert_not_called()


def test_send_email_posts_to_resend(monkeypatch):
    monkeypatch.setattr(settings, "resend_api_key", "re_test_key")
    monkeypatch.setattr(
        settings, "reminder_from_email", "Dossier <reminders@dossiertool.com>"
    )
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    with patch("app.email.httpx.post", return_value=resp) as post:
        assert send_email("to@example.com", "Subject", "<p>body</p>") is True

    url, kwargs = post.call_args[0][0], post.call_args[1]
    assert url == "https://api.resend.com/emails"
    assert kwargs["headers"]["Authorization"] == "Bearer re_test_key"
    assert kwargs["json"]["from"] == "Dossier <reminders@dossiertool.com>"
    assert kwargs["json"]["to"] == ["to@example.com"]
    assert kwargs["json"]["subject"] == "Subject"
    assert kwargs["json"]["html"] == "<p>body</p>"
