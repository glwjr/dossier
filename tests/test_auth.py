from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

from app.auth import create_access_token
from app.config import settings
from app.models.user import User

# --- /auth/login ---


def test_login_redirects_to_google(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    response = raw_client.get("/auth/login", follow_redirects=False)
    assert response.status_code in (302, 307)
    location = response.headers["location"]
    assert "accounts.google.com" in location
    assert "test-client-id" in location
    assert "state=" in location


def test_login_returns_501_without_credentials(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    response = raw_client.get("/auth/login")
    assert response.status_code == 501


# --- /auth/callback ---


def _mock_google(email="oauth-user@example.com", name="OAuth User"):
    """Return a mock httpx.Client context manager that simulates Google's API."""
    mock_token_resp = MagicMock()
    mock_token_resp.json.return_value = {"access_token": "google-access-token"}
    mock_token_resp.raise_for_status = MagicMock()

    mock_userinfo_resp = MagicMock()
    mock_userinfo_resp.json.return_value = {"email": email, "name": name}
    mock_userinfo_resp.raise_for_status = MagicMock()

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.post.return_value = mock_token_resp
    mock_client.get.return_value = mock_userinfo_resp
    return mock_client


def test_callback_creates_user_and_returns_jwt(raw_client, db_session, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "test-secret")

    # Hit /auth/login to get a real state + cookie
    login_resp = raw_client.get("/auth/login", follow_redirects=False)
    state_cookie = login_resp.cookies.get("oauth_state")
    state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]

    with patch("app.routers.auth.httpx.Client", return_value=_mock_google()):
        response = raw_client.get(
            f"/auth/callback?code=test_code&state={state}",
            cookies={"oauth_state": state_cookie},
        )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_callback_rejects_invalid_state(raw_client):
    response = raw_client.get(
        "/auth/callback?code=test_code&state=wrong",
        cookies={"oauth_state": "right"},
    )
    assert response.status_code == 400


def test_callback_rejects_missing_state_cookie(raw_client):
    response = raw_client.get("/auth/callback?code=test_code&state=any")
    assert response.status_code == 400


# --- JWT / get_current_user ---


def test_valid_jwt_authenticates_user(raw_client, db_session):
    user = User(email="jwt-user@example.com", name="JWT User")
    db_session.add(user)
    db_session.flush()

    token = create_access_token({"sub": "jwt-user@example.com"})
    response = raw_client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "jwt-user@example.com"


def test_invalid_jwt_returns_401(raw_client):
    response = raw_client.get(
        "/me", headers={"Authorization": "Bearer not.a.valid.token"}
    )
    assert response.status_code == 401


def test_missing_auth_header_returns_401(raw_client):
    response = raw_client.get("/me")
    assert response.status_code == 401


def test_jwt_for_nonexistent_user_returns_401(raw_client):
    token = create_access_token({"sub": "ghost@example.com"})
    response = raw_client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
