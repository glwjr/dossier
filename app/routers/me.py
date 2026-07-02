import json
import secrets
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import clear_auth_cookie, get_current_user
from app.db import get_db
from app.models.advisor import Advisor
from app.models.deadline import Deadline
from app.models.document import Document
from app.models.program import Program
from app.models.recommender import ProgramRecommender, Recommender
from app.models.requirement import Requirement
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(tags=["me"])


def _reject_demo(current_user: User) -> None:
    """Block account-management mutations on TTL-managed demo accounts."""
    if current_user.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not available on demo accounts",
        )


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permanently delete the account and all of its data (GDPR erasure).

    Children are removed explicitly in foreign-key-safe order rather than
    relying on ON DELETE CASCADE, so deletion works regardless of the schema's
    cascade configuration.
    """
    # Demo accounts are TTL-managed; self-deletion would just orphan the session.
    _reject_demo(current_user)

    program_ids = select(Program.id).where(Program.user_id == current_user.id)
    db.execute(delete(Requirement).where(Requirement.program_id.in_(program_ids)))
    db.execute(delete(Deadline).where(Deadline.program_id.in_(program_ids)))
    db.execute(delete(Advisor).where(Advisor.program_id.in_(program_ids)))
    db.execute(delete(Document).where(Document.program_id.in_(program_ids)))
    db.execute(
        delete(ProgramRecommender).where(ProgramRecommender.program_id.in_(program_ids))
    )
    db.execute(delete(Program).where(Program.user_id == current_user.id))
    db.execute(delete(Recommender).where(Recommender.user_id == current_user.id))
    db.delete(current_user)
    db.commit()
    clear_auth_cookie(response)


@router.post("/me/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invalidate every outstanding JWT for this user by bumping token_version.

    The token used for this request is included — the caller is signed out
    everywhere and must re-authenticate. Also clears this browser's cookie.
    """
    current_user.token_version += 1
    db.commit()
    clear_auth_cookie(response)


@router.post("/me/calendar-token", response_model=UserRead)
def rotate_calendar_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate (or rotate) the secret token for the private .ics calendar feed."""
    _reject_demo(current_user)
    current_user.calendar_token = secrets.token_urlsafe(24)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/calendar-token", response_model=UserRead)
def revoke_calendar_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke the calendar feed; existing subscribers stop receiving updates."""
    _reject_demo(current_user)
    current_user.calendar_token = None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/export")
def export(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    programs = db.scalars(
        select(Program)
        .where(Program.user_id == current_user.id)
        .order_by(Program.created_at)
    ).all()

    program_ids = [p.id for p in programs]

    requirements = db.scalars(
        select(Requirement).where(Requirement.program_id.in_(program_ids))
    ).all()
    deadlines = db.scalars(
        select(Deadline).where(Deadline.program_id.in_(program_ids))
    ).all()
    advisors = db.scalars(
        select(Advisor).where(Advisor.program_id.in_(program_ids))
    ).all()
    documents = db.scalars(
        select(Document).where(Document.program_id.in_(program_ids))
    ).all()
    prog_recs = db.scalars(
        select(ProgramRecommender).where(ProgramRecommender.program_id.in_(program_ids))
    ).all()
    recommenders = db.scalars(
        select(Recommender)
        .where(Recommender.user_id == current_user.id)
        .order_by(Recommender.name)
    ).all()

    reqs_by_pid: dict[int, list] = defaultdict(list)
    dls_by_pid: dict[int, list] = defaultdict(list)
    adv_by_pid: dict[int, list] = defaultdict(list)
    docs_by_pid: dict[int, list] = defaultdict(list)
    recs_by_pid: dict[int, list] = defaultdict(list)

    rec_by_id = {r.id: r for r in recommenders}

    for r in requirements:
        reqs_by_pid[r.program_id].append(r)
    for d in deadlines:
        dls_by_pid[d.program_id].append(d)
    for o in advisors:
        adv_by_pid[o.program_id].append(o)
    for d in documents:
        docs_by_pid[d.program_id].append(d)
    for pr in prog_recs:
        rec = rec_by_id.get(pr.recommender_id)
        recs_by_pid[pr.program_id].append(
            {
                "name": rec.name if rec else None,
                "institution": rec.institution if rec else None,
                "status": pr.status,
                "due_date": pr.due_date.isoformat() if pr.due_date else None,
                "notes": pr.notes,
            }
        )

    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "user": {
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat(),
        },
        "programs": [
            {
                "school": p.school,
                "department": p.department,
                "degree": p.degree,
                "tier": p.tier,
                "status": p.status,
                "app_fee": p.app_fee,
                "url": p.url,
                "notes": p.notes,
                "created_at": p.created_at.isoformat(),
                "requirements": [
                    {
                        "label": r.label,
                        "kind": r.kind,
                        "status": r.status,
                        "due_date": r.due_date.isoformat() if r.due_date else None,
                        "notes": r.notes,
                    }
                    for r in reqs_by_pid[p.id]
                ],
                "deadlines": [
                    {
                        "kind": d.kind,
                        "due_date": d.due_date.isoformat(),
                        "done": d.done,
                        "notes": d.notes,
                    }
                    for d in dls_by_pid[p.id]
                ],
                "advisors": [
                    {
                        "name": o.name,
                        "email": o.email,
                        "url": o.url,
                        "research_area": o.research_area,
                        "contacted_on": (
                            o.contacted_on.isoformat() if o.contacted_on else None
                        ),
                        "response": o.response,
                        "notes": o.notes,
                    }
                    for o in adv_by_pid[p.id]
                ],
                "documents": [
                    {
                        "title": d.title,
                        "kind": d.kind,
                        "status": d.status,
                        "url": d.url,
                        "notes": d.notes,
                    }
                    for d in docs_by_pid[p.id]
                ],
                "recommenders": recs_by_pid[p.id],
            }
            for p in programs
        ],
        "recommenders": [
            {
                "name": r.name,
                "institution": r.institution,
                "email": r.email,
                "notes": r.notes,
            }
            for r in recommenders
        ],
    }

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return Response(
        content=json.dumps(payload, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="dossier-export-{today}.json"'
        },
    )
