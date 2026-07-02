from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlparse

import httpx

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


def test_login_state_cookie_is_secure_in_prod(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "frontend_url", "https://my.example.com")
    response = raw_client.get("/auth/login", follow_redirects=False)
    set_cookie = response.headers["set-cookie"]
    assert "oauth_state=" in set_cookie
    assert "Secure" in set_cookie


def test_login_state_cookie_not_secure_in_dev(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "frontend_url", "")
    response = raw_client.get("/auth/login", follow_redirects=False)
    set_cookie = response.headers["set-cookie"]
    assert "oauth_state=" in set_cookie
    assert "Secure" not in set_cookie


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
    mock_userinfo_resp.json.return_value = {
        "email": email,
        "name": name,
        "verified_email": True,
    }
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
    monkeypatch.setattr(settings, "frontend_url", "")

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


def test_callback_redirects_to_frontend_when_configured(
    raw_client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "test-secret")
    monkeypatch.setattr(settings, "frontend_url", "http://localhost:3000")

    login_resp = raw_client.get("/auth/login", follow_redirects=False)
    state_cookie = login_resp.cookies.get("oauth_state")
    state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]

    with patch("app.routers.auth.httpx.Client", return_value=_mock_google()):
        response = raw_client.get(
            f"/auth/callback?code=test_code&state={state}",
            cookies={"oauth_state": state_cookie},
            follow_redirects=False,
        )

    assert response.status_code in (302, 307)
    assert response.headers["location"].startswith(
        "http://localhost:3000/auth/callback?token="
    )


def test_callback_rejects_invalid_state(raw_client):
    response = raw_client.get(
        "/auth/callback?code=test_code&state=wrong",
        cookies={"oauth_state": "right"},
    )
    assert response.status_code == 400


def test_callback_rejects_missing_state_cookie(raw_client):
    response = raw_client.get("/auth/callback?code=test_code&state=any")
    assert response.status_code == 400


def _valid_state(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "test-secret")
    monkeypatch.setattr(settings, "frontend_url", "")
    login_resp = raw_client.get("/auth/login", follow_redirects=False)
    state_cookie = login_resp.cookies.get("oauth_state")
    state = parse_qs(urlparse(login_resp.headers["location"]).query)["state"][0]
    return state, state_cookie


def test_callback_returns_502_when_google_errors(raw_client, monkeypatch):
    state, state_cookie = _valid_state(raw_client, monkeypatch)

    mock_client = _mock_google()
    mock_client.post.return_value.raise_for_status.side_effect = httpx.RequestError(
        "google down"
    )
    with patch("app.routers.auth.httpx.Client", return_value=mock_client):
        response = raw_client.get(
            f"/auth/callback?code=test_code&state={state}",
            cookies={"oauth_state": state_cookie},
        )
    assert response.status_code == 502


def test_callback_returns_400_when_no_email(raw_client, monkeypatch):
    state, state_cookie = _valid_state(raw_client, monkeypatch)

    mock_client = _mock_google()
    mock_client.get.return_value.json.return_value = {"name": "No Email"}
    with patch("app.routers.auth.httpx.Client", return_value=mock_client):
        response = raw_client.get(
            f"/auth/callback?code=test_code&state={state}",
            cookies={"oauth_state": state_cookie},
        )
    assert response.status_code == 400


def test_callback_rejects_unverified_email(raw_client, monkeypatch):
    state, state_cookie = _valid_state(raw_client, monkeypatch)

    mock_client = _mock_google()
    mock_client.get.return_value.json.return_value = {
        "email": "unverified@example.com",
        "name": "Unverified",
        "verified_email": False,
    }
    with patch("app.routers.auth.httpx.Client", return_value=mock_client):
        response = raw_client.get(
            f"/auth/callback?code=test_code&state={state}",
            cookies={"oauth_state": state_cookie},
        )
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


def test_jwt_without_ver_claim_treated_as_zero(raw_client, db_session):
    # Tokens issued before token_version existed carry no "ver"; they must still
    # authenticate a user whose version is still the default 0.
    user = User(email="nover@example.com", name="No Ver")
    db_session.add(user)
    db_session.flush()
    token = create_access_token({"sub": user.email})
    response = raw_client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_jwt_rejected_after_token_version_bump(raw_client, db_session):
    user = User(email="ver-user@example.com", name="Ver User")
    db_session.add(user)
    db_session.flush()
    token = create_access_token({"sub": user.email, "ver": user.token_version})

    assert (
        raw_client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 200
    )

    # Bumping the version invalidates the previously issued token.
    user.token_version += 1
    db_session.flush()
    assert (
        raw_client.get("/me", headers={"Authorization": f"Bearer {token}"}).status_code
        == 401
    )
