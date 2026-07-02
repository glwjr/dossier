"""Scheduled maintenance endpoints, triggered by an external cron (GitHub
Actions) rather than a signed-in user. Protected by a shared CRON_SECRET.
"""

import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.email import send_email
from app.models.user import User
from app.reminders import build_digest

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _require_cron(x_cron_key: str = Header(default="", alias="X-Cron-Key")) -> None:
    # Blank CRON_SECRET disables the endpoint entirely (fail closed).
    if not settings.cron_secret or not hmac.compare_digest(
        x_cron_key, settings.cron_secret
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.post("/weekly-digest", dependencies=[Depends(_require_cron)])
def weekly_digest(db: Session = Depends(get_db)):
    """Email each opted-in, non-demo user a digest of what's due soon."""
    users = db.scalars(
        select(User).where(
            User.email_reminders.is_(True),
            User.is_demo.is_(False),
        )
    ).all()

    sent = 0
    for user in users:
        digest = build_digest(db, user)
        if digest is None:
            continue
        subject, html = digest
        if send_email(user.email, subject, html):
            sent += 1

    return {"considered": len(users), "sent": sent}
