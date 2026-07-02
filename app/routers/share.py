"""Public (token-authenticated) read-only view of a user's program slate.

Like the calendar feed, the unguessable token in the URL is the only credential
— no login. Exposes only program-level summary fields, never notes, contacts,
requirements, or account data.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.program import Program
from app.models.user import User
from app.schemas.share import ShareProgram, ShareView

router = APIRouter(tags=["share"])


@router.get("/share/{token}", response_model=ShareView)
def shared_view(token: str, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.share_token == token))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Share link not found"
        )
    programs = db.scalars(
        select(Program).where(Program.user_id == user.id).order_by(Program.school)
    ).all()
    return ShareView(
        name=user.name,
        programs=[ShareProgram.model_validate(p) for p in programs],
    )
