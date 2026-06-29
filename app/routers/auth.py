import hmac
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import create_access_token
from app.config import settings
from app.db import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/login")
def login() -> RedirectResponse:
    """Redirect the browser to Google's OAuth consent screen."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="GOOGLE_CLIENT_ID is not configured",
        )
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
    }
    redirect = RedirectResponse(f"{_GOOGLE_AUTH_URL}?{urlencode(params)}")
    redirect.set_cookie(
        "oauth_state",
        state,
        httponly=True,
        samesite="lax",
        # Secure in deployed environments (HTTPS); relaxed for local http dev.
        secure=bool(settings.frontend_url),
        max_age=600,
    )
    return redirect


@router.get("/callback")
def callback(
    code: str,
    state: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Handle Google's redirect: exchange the code for a Dossier JWT."""
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or not hmac.compare_digest(state, stored_state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state — possible CSRF",
        )

    try:
        with httpx.Client() as client:
            token_resp = client.post(
                _GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            google_access_token = token_resp.json()["access_token"]

            userinfo_resp = client.get(
                _GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {google_access_token}"},
            )
            userinfo_resp.raise_for_status()
            userinfo = userinfo_resp.json()
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        # Upstream rejected the code, timed out, or returned an unexpected
        # body — surface a 502 rather than a bare 500.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to complete Google sign-in",
        ) from exc

    email: str | None = userinfo.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not provide an email address",
        )
    # Fall back to the email for a null/empty/missing name — users.name is NOT NULL.
    name: str = userinfo.get("name") or email

    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, name=name)
        db.add(user)
        db.commit()
    elif user.name != name:
        user.name = name
        db.commit()

    access_token = create_access_token({"sub": email})

    if settings.frontend_url:
        return RedirectResponse(
            f"{settings.frontend_url}/auth/callback?token={access_token}"
        )
    return {"access_token": access_token, "token_type": "bearer"}
