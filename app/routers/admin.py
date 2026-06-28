from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.db import get_db
from app.models.user import User
from app.schemas.admin import AdminStats, AdminUserRow, WeeklySignup

router = APIRouter(tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not settings.admin_email or current_user.email != settings.admin_email:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user


@router.get("/admin/stats", response_model=AdminStats)
def admin_stats(
    _: User = Depends(_require_admin),
    db: Session = Depends(get_db),
):
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()

    today = date.today()
    week_start = today - timedelta(days=today.weekday())  # Monday

    counts: dict[str, int] = defaultdict(int)
    signups_this_week = 0
    for user in users:
        user_date = user.created_at.date()
        year, week, _ = user_date.isocalendar()
        counts[f"{year}-W{week:02d}"] += 1
        if user_date >= week_start:
            signups_this_week += 1

    weekly = []
    for i in range(11, -1, -1):
        d = today - timedelta(weeks=i)
        year, week, _ = d.isocalendar()
        label = f"{year}-W{week:02d}"
        weekly.append(WeeklySignup(week=label, count=counts.get(label, 0)))

    return AdminStats(
        total_users=len(users),
        signups_this_week=signups_this_week,
        weekly_signups=weekly,
        users=[AdminUserRow.model_validate(u) for u in users],
    )
