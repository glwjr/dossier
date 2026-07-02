"""Build the weekly reminder digest: upcoming deadlines, dated requirements, and
pending recommender letters for a user, within a due-date window.

Pure query + render — sending is done by the caller (app/email.py), and the
scheduled endpoint (routers/tasks.py) iterates opted-in users.
"""

from datetime import date, timedelta
from html import escape

from sqlalchemy import select

from app.config import settings
from app.models.deadline import Deadline
from app.models.program import Program
from app.models.recommender import ProgramRecommender, Recommender, RecommenderStatus
from app.models.requirement import Requirement, RequirementStatus
from app.models.user import User


def _fmt(d: date) -> str:
    return f"{d:%b} {d.day}, {d.year}"


def collect_due_items(db, user: User, today: date, window_days: int) -> list[dict]:
    """Undone deadlines, dated requirements, and pending letters due in
    [today, today + window_days], sorted by due date."""
    horizon = today + timedelta(days=window_days)
    programs = {
        p.id: p for p in db.scalars(select(Program).where(Program.user_id == user.id))
    }
    program_ids = list(programs)
    items: list[dict] = []
    if not program_ids:
        return items

    def school(pid: int) -> str:
        p = programs.get(pid)
        return p.school if p else ""

    for d in db.scalars(
        select(Deadline).where(
            Deadline.program_id.in_(program_ids),
            Deadline.done.is_(False),
            Deadline.due_date >= today,
            Deadline.due_date <= horizon,
        )
    ):
        items.append(
            {
                "due": d.due_date,
                "title": f"{school(d.program_id)} — {d.kind.value} deadline",
            }
        )

    for r in db.scalars(
        select(Requirement).where(
            Requirement.program_id.in_(program_ids),
            Requirement.due_date.is_not(None),
            Requirement.due_date >= today,
            Requirement.due_date <= horizon,
            Requirement.status.notin_(
                [RequirementStatus.done, RequirementStatus.waived]
            ),
        )
    ):
        items.append(
            {"due": r.due_date, "title": f"{school(r.program_id)} — {r.label}"}
        )

    for pr in db.scalars(
        select(ProgramRecommender).where(
            ProgramRecommender.program_id.in_(program_ids),
            ProgramRecommender.due_date.is_not(None),
            ProgramRecommender.due_date >= today,
            ProgramRecommender.due_date <= horizon,
            ProgramRecommender.status != RecommenderStatus.submitted,
        )
    ):
        rec = db.get(Recommender, pr.recommender_id)
        name = rec.name if rec else "recommender"
        items.append(
            {
                "due": pr.due_date,
                "title": f"{school(pr.program_id)} — letter from {name}",
            }
        )

    items.sort(key=lambda i: i["due"])
    return items


def _render_html(user: User, items: list[dict]) -> str:
    rows = "".join(
        f"<li><strong>{_fmt(i['due'])}</strong> — {escape(i['title'])}</li>"
        for i in items
    )
    account_url = f"{settings.frontend_url}/account" if settings.frontend_url else "#"
    return (
        f"<p>Hi {escape(user.name)},</p>"
        f"<p>You have {len(items)} item(s) due in the next "
        f"{settings.reminder_window_days} days:</p>"
        f"<ul>{rows}</ul>"
        f'<p style="color:#6b7280;font-size:12px">'
        f"Manage or turn off these reminders in your "
        f'<a href="{account_url}">account settings</a>.</p>'
    )


def build_digest(
    db, user: User, today: date | None = None, window_days: int | None = None
) -> tuple[str, str] | None:
    """Return (subject, html) for the user's digest, or None if nothing is due."""
    today = today or date.today()
    if window_days is None:
        window_days = settings.reminder_window_days
    items = collect_due_items(db, user, today, window_days)
    if not items:
        return None
    subject = f"Dossier: {len(items)} item(s) due soon"
    return subject, _render_html(user, items)
