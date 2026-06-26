import os

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User

DEV_USER_EMAIL: str = os.environ.get("DEV_USER_EMAIL", "dev@example.com")


def get_current_user(db: Session = Depends(get_db)) -> User:
    # Phase 1: return the seeded dev user.
    # Phase 2: validate the OAuth session / token here. NOTHING ELSE CHANGES.
    user = db.scalar(select(User).where(User.email == DEV_USER_EMAIL))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Dev user not seeded — run seed.py first",
        )
    return user
