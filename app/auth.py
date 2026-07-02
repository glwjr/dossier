from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.user import User

# Name of the HttpOnly cookie carrying the JWT. Shared with the Next.js
# middleware (ui/proxy.ts), which reads it server-side to gate routes.
AUTH_COOKIE = "dossier_token"


def create_access_token(data: dict) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    payload["iat"] = now
    payload["exp"] = now + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def set_auth_cookie(response: Response, token: str) -> None:
    """Attach the JWT as an HttpOnly, same-site cookie.

    HttpOnly keeps the token out of JavaScript entirely (no XSS exfiltration);
    SameSite=Lax neutralizes CSRF on state-changing (POST/PATCH/DELETE) requests.
    Secure is on wherever the app is deployed (browsers treat localhost as a
    secure context, so it works in http dev too).
    """
    response.set_cookie(
        AUTH_COOKIE,
        token,
        max_age=settings.access_token_expire_minutes * 60,
        httponly=True,
        secure=bool(settings.frontend_url),
        samesite="lax",
        domain=settings.cookie_domain or None,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Expire the auth cookie. Attributes must match set_auth_cookie to delete."""
    response.delete_cookie(
        AUTH_COOKIE,
        domain=settings.cookie_domain or None,
        path="/",
        httponly=True,
        secure=bool(settings.frontend_url),
        samesite="lax",
    )


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    token = request.cookies.get(AUTH_COOKIE)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        raise credentials_exception
    # Reject tokens minted before the user's last "sign out everywhere".
    # Missing claim (tokens predating token_version) is treated as version 0.
    if payload.get("ver", 0) != user.token_version:
        raise credentials_exception
    return user
