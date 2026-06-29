"""Shared ownership-resolution helpers.

Nested resources are authorized through their parent program: load the
``Program`` scoped to ``current_user`` first, 404 if it isn't theirs. This
helper is the single source of truth for that check across routers.
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.user import User


def get_program_or_404(program_id: int, current_user: User, db: Session) -> Program:
    program = db.scalar(
        select(Program).where(
            Program.id == program_id,
            Program.user_id == current_user.id,
        )
    )
    if program is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Program not found"
        )
    return program
