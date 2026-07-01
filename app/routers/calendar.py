from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.deadline import Deadline
from app.models.program import Program
from app.models.requirement import Requirement
from app.models.user import User

router = APIRouter(tags=["calendar"])


def _escape(text: str) -> str:
    """Escape text per RFC 5545 (backslash, semicolon, comma, newlines)."""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
        .replace("\r", "\\n")
    )


def _event(
    uid: str, due: date, summary: str, notes: str | None, stamp: str
) -> list[str]:
    lines = [
        "BEGIN:VEVENT",
        f"UID:{uid}@dossiertool.com",
        f"DTSTAMP:{stamp}",
        # All-day event: DTEND is exclusive, so add one day.
        f"DTSTART;VALUE=DATE:{due.strftime('%Y%m%d')}",
        f"DTEND;VALUE=DATE:{(due + timedelta(days=1)).strftime('%Y%m%d')}",
        f"SUMMARY:{_escape(summary)}",
    ]
    if notes:
        lines.append(f"DESCRIPTION:{_escape(notes)}")
    lines.append("END:VEVENT")
    return lines


@router.get("/calendar/{token}.ics")
def calendar_feed(token: str, db: Session = Depends(get_db)):
    """Public (token-authenticated) iCalendar feed of deadlines and dated
    requirements. Subscribed to by calendar apps, which fetch it without an
    auth header — so the secret token in the URL is the only credential."""
    user = db.scalar(select(User).where(User.calendar_token == token))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Calendar not found"
        )

    programs = {
        p.id: p for p in db.scalars(select(Program).where(Program.user_id == user.id))
    }
    program_ids = list(programs)

    deadlines = (
        db.scalars(select(Deadline).where(Deadline.program_id.in_(program_ids))).all()
        if program_ids
        else []
    )
    requirements = (
        db.scalars(
            select(Requirement).where(
                Requirement.program_id.in_(program_ids),
                Requirement.due_date.is_not(None),
            )
        ).all()
        if program_ids
        else []
    )

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Dossier//Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Dossier",
    ]

    for d in deadlines:
        school = programs[d.program_id].school
        kind = d.kind.value.replace("_", " ")
        lines += _event(
            f"dossier-deadline-{d.id}",
            d.due_date,
            f"{school}: {kind} deadline",
            d.notes,
            stamp,
        )
    for r in requirements:
        school = programs[r.program_id].school
        lines += _event(
            f"dossier-requirement-{r.id}",
            r.due_date,
            f"{school}: {r.label}",
            r.notes,
            stamp,
        )

    lines.append("END:VCALENDAR")
    body = "\r\n".join(lines) + "\r\n"
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": 'inline; filename="dossier.ics"'},
    )
