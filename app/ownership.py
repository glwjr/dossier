"""Shared ownership-resolution helpers.

Nested resources are authorized through their parent program: load the
``Program`` scoped to ``current_user`` first, 404 if it isn't theirs. These
helpers are the single source of truth for that check across routers.
"""

from typing import TypeVar

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.program import Program
from app.models.user import User

# Program-owned child models expose a ``program_id`` foreign key and an ``id``
# primary key; the type var keeps get_owned_child_or_404's return type bound to
# whatever model class the caller passes in.
Child = TypeVar("Child")


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


def get_owned_child_or_404(
    model: type[Child], obj_id: int, current_user: User, db: Session
) -> Child:
    """Load a program-owned child row by id, verifying ownership through the
    parent program via a join. 404 if it doesn't exist or isn't the user's.

    ``model`` must be a mapped class with ``id`` and ``program_id`` columns
    (Requirement, Deadline, Document, Advisor). The 404 detail is derived from
    the class name, e.g. ``Requirement not found``.
    """
    obj = db.scalar(
        select(model)
        .join(Program, model.program_id == Program.id)
        .where(model.id == obj_id, Program.user_id == current_user.id)
    )
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{model.__name__} not found",
        )
    return obj
