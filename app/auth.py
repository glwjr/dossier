from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models.user import User

_bearer = HTTPBearer()


def create_access_token(data: dict) -> str:
    payload = data.copy()
    now = datetime.now(timezone.utc)
    payload["iat"] = now
    payload["exp"] = now + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
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
