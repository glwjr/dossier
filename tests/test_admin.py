import pytest

from app.config import settings


def test_admin_stats_forbidden_when_no_admin_email_set(client):
    r = client.get("/admin/stats")
    assert r.status_code == 403


def test_admin_stats_forbidden_for_non_admin(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", "someone-else@example.com")
    r = client.get("/admin/stats")
    assert r.status_code == 403


def test_admin_stats_ok(client, monkeypatch):
    monkeypatch.setattr(settings, "admin_email", settings.dev_user_email)
    r = client.get("/admin/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["total_users"] >= 1
    assert data["signups_this_week"] >= 0
    assert len(data["weekly_signups"]) == 12
    assert all("week" in w and "count" in w for w in data["weekly_signups"])
    assert any(u["email"] == settings.dev_user_email for u in data["users"])
