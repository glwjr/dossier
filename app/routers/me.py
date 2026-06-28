import json
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.deadline import Deadline
from app.models.document import Document
from app.models.outreach import OutreachContact
from app.models.program import Program
from app.models.recommender import ProgramRecommender, Recommender
from app.models.requirement import Requirement
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(tags=["me"])


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
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
    outreach = db.scalars(
        select(OutreachContact).where(OutreachContact.program_id.in_(program_ids))
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
    out_by_pid: dict[int, list] = defaultdict(list)
    docs_by_pid: dict[int, list] = defaultdict(list)
    recs_by_pid: dict[int, list] = defaultdict(list)

    rec_by_id = {r.id: r for r in recommenders}

    for r in requirements:
        reqs_by_pid[r.program_id].append(r)
    for d in deadlines:
        dls_by_pid[d.program_id].append(d)
    for o in outreach:
        out_by_pid[o.program_id].append(o)
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
                "outreach": [
                    {
                        "name": o.name,
                        "email": o.email,
                        "url": o.url,
                        "contacted_on": (
                            o.contacted_on.isoformat() if o.contacted_on else None
                        ),
                        "response": o.response,
                        "notes": o.notes,
                    }
                    for o in out_by_pid[p.id]
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
