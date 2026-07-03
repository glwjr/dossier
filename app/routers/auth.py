import hmac
import secrets
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import clear_auth_cookie, create_access_token, set_auth_cookie
from app.config import settings
from app.db import get_db
from app.demo import (
    clone_user_data,
    purge_expired_demo_users,
    purge_surplus_demo_users,
)
from app.models.user import User
from app.ratelimit import rate_limit_demo

router = APIRouter(prefix="/auth", tags=["auth"])

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# CSRF-protection state for the OAuth round-trip. Scoped to /auth so it isn't
# sent on every API request, and expired after one use in the callback.
_STATE_COOKIE = "oauth_state"
_STATE_COOKIE_PATH = "/auth"


def _clear_state_cookie(response: Response) -> None:
    # Attributes must match the set_cookie call in login() to delete.
    response.delete_cookie(
        _STATE_COOKIE,
        path=_STATE_COOKIE_PATH,
        httponly=True,
        secure=bool(settings.frontend_url),
        samesite="lax",
    )


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
        _STATE_COOKIE,
        state,
        httponly=True,
        samesite="lax",
        # Secure in deployed environments (HTTPS); relaxed for local http dev.
        secure=bool(settings.frontend_url),
        max_age=600,
        path=_STATE_COOKIE_PATH,
    )
    return redirect


@router.get("/callback")
def callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Handle Google's redirect: exchange the code for a Dossier JWT."""
    if error or not code:
        # The user cancelled on Google's consent screen (or Google reported
        # an error) — no session to mint. Send them back to the app; the
        # frontend middleware bounces unauthenticated visitors to the
        # marketing/login site.
        if settings.frontend_url:
            return RedirectResponse(f"{settings.frontend_url}/")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google sign-in was cancelled",
        )

    stored_state = request.cookies.get(_STATE_COOKIE)
    if not state or not stored_state or not hmac.compare_digest(state, stored_state):
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
    # Only trust a Google-verified email as identity — every downstream decision
    # (user identity, ADMIN_EMAIL gating) keys off it.
    if not userinfo.get("verified_email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is not verified",
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

    response = _issue_token(email, user.token_version)
    # The state served its purpose — expire it so it can't be replayed.
    _clear_state_cookie(response)
    return response


def _require_same_site_origin(request: Request) -> None:
    """Reject browser POSTs from third-party pages (login CSRF).

    A cross-site page can auto-submit a top-level form to /auth/demo; the
    Set-Cookie on the response would silently replace a signed-in user's
    session with a throwaway demo account (SameSite=Lax doesn't stop the
    response from setting cookies). Browsers always send Origin on
    cross-site POSTs, so requests without one (curl, tests, calendar-style
    non-browser clients) are safe to allow.

    Trusted origins: the deployed frontend, plus any host under the shared
    parent domain (COOKIE_DOMAIN — where the marketing site's demo form
    lives). When neither is configured (local dev) there is nothing to
    check against.
    """
    origin = request.headers.get("origin")
    if not origin:
        return
    frontend_host = (
        urlparse(settings.frontend_url).netloc if settings.frontend_url else ""
    )
    parent = settings.cookie_domain.lstrip(".") if settings.cookie_domain else ""
    if not frontend_host and not parent:
        return

    parsed = urlparse(origin)
    if frontend_host and parsed.netloc == frontend_host:
        return
    hostname = parsed.hostname or ""
    if parent and (hostname == parent or hostname.endswith("." + parent)):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Cross-site demo login is not allowed",
    )


@router.post(
    "/demo",
    dependencies=[Depends(_require_same_site_origin), Depends(rate_limit_demo)],
)
def demo_login(db: Session = Depends(get_db)):
    """Log into a throwaway account seeded with a copy of the demo template data.

    No OAuth: mints a JWT for a fresh, isolated demo user. Expired demo accounts
    are garbage-collected here, so cleanup piggybacks on demo traffic.

    POST (not GET) so link-preview bots, crawlers, and browser prefetch can't
    spawn accounts by following the marketing-site link.
    """
    if not settings.demo_template_email:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Demo login is not configured",
        )

    purge_expired_demo_users(db, ttl_hours=settings.demo_ttl_hours)
    # Evict down to cap-1 so this new account keeps us at or under the ceiling.
    purge_surplus_demo_users(db, max_users=max(settings.demo_max_users - 1, 0))

    template = db.scalar(select(User).where(User.email == settings.demo_template_email))
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Demo template user has not been seeded",
        )

    email = f"demo-{secrets.token_urlsafe(8)}@demo.local"
    demo_user = User(email=email, name="Demo User", is_demo=True)
    db.add(demo_user)
    db.flush()
    clone_user_data(db, template, demo_user)
    db.commit()

    # 303: this is a POST, so the browser must GET the destination, not re-POST.
    return _issue_token(
        email, demo_user.token_version, redirect_status=status.HTTP_303_SEE_OTHER
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    """Sign out of this browser by clearing the auth cookie.

    Only the server can clear an HttpOnly cookie, so sign-out is an endpoint
    rather than client-side JS. Idempotent and safe to call unauthenticated.
    """
    clear_auth_cookie(response)


def _issue_token(
    email: str,
    token_version: int,
    redirect_status: int = status.HTTP_307_TEMPORARY_REDIRECT,
):
    """Set the JWT as an HttpOnly cookie, then redirect to the app (or return
    JSON when no frontend is configured, e.g. local API-only use and tests)."""
    access_token = create_access_token({"sub": email, "ver": token_version})
    if settings.frontend_url:
        response: Response = RedirectResponse(
            f"{settings.frontend_url}/", status_code=redirect_status
        )
    else:
        response = JSONResponse({"access_token": access_token, "token_type": "bearer"})
    set_auth_cookie(response, access_token)
    return response
