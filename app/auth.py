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

# iss/aud pin tokens to this service, so a token signed by anything else that
# ever shares the key can't authenticate here.
JWT_ISSUER = "dossier-api"
JWT_AUDIENCE = "dossier"


def create_access_token(data: dict) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    payload["iat"] = now
    payload["exp"] = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload["iss"] = JWT_ISSUER
    payload["aud"] = JWT_AUDIENCE
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
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            # iss/aud are checked manually below: tokens minted before these
            # claims existed carry neither and must keep working until they
            # expire (same grandfathering as the "ver" claim).
            options={"verify_aud": False},
        )
        sub = payload.get("sub")
        if not isinstance(sub, str) or not sub:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    if payload.get("aud", JWT_AUDIENCE) != JWT_AUDIENCE:
        raise credentials_exception
    if payload.get("iss", JWT_ISSUER) != JWT_ISSUER:
        raise credentials_exception

    if sub.isdigit():
        # Canonical subject: the user id. Sessions track the account, so an
        # email change or a delete-and-re-signup never revives old tokens.
        user = db.get(User, int(sub))
    else:
        # Legacy subject (pre-id tokens): the email. Grandfathered until those
        # tokens expire — safe to remove one token lifetime after deploying.
        user = db.scalar(select(User).where(User.email == sub))
    if user is None:
        raise credentials_exception
    # Reject tokens minted before the user's last "sign out everywhere".
    # Missing claim (tokens predating token_version) is treated as version 0.
    if payload.get("ver", 0) != user.token_version:
        raise credentials_exception
    return user
