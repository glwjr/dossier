from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager

from app.auth import get_current_user
from app.db import get_db
from app.models.deadline import Deadline
from app.models.program import Program
from app.models.user import User
from app.ownership import get_program_or_404
from app.schemas.deadline import (
    DeadlineCreate,
    DeadlineRead,
    DeadlineUpdate,
    DeadlineWithProgramRead,
)

router = APIRouter(tags=["deadlines"])


def _get_deadline_or_404(deadline_id: int, current_user: User, db: Session) -> Deadline:
    """Load a deadline; verify ownership via a join through the parent program."""
    deadline = db.scalar(
        select(Deadline)
        .join(Program, Deadline.program_id == Program.id)
        .where(Deadline.id == deadline_id, Program.user_id == current_user.id)
    )
    if deadline is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found"
        )
    return deadline


@router.get("/deadlines", response_model=list[DeadlineWithProgramRead])
def list_all_deadlines(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Deadline)
        .join(Program, Deadline.program_id == Program.id)
        .options(contains_eager(Deadline.program))
        .where(Program.user_id == current_user.id)
        .order_by(Deadline.due_date)
    ).all()


@router.get("/programs/{program_id}/deadlines", response_model=list[DeadlineRead])
def list_deadlines(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    return db.scalars(
        select(Deadline)
        .where(Deadline.program_id == program_id)
        .order_by(Deadline.due_date)
    ).all()


@router.post(
    "/programs/{program_id}/deadlines",
    response_model=DeadlineRead,
    status_code=status.HTTP_201_CREATED,
)
def create_deadline(
    program_id: int,
    body: DeadlineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    deadline = Deadline(**body.model_dump(), program_id=program_id)
    db.add(deadline)
    db.commit()
    db.refresh(deadline)
    return deadline


@router.patch("/deadlines/{deadline_id}", response_model=DeadlineRead)
def update_deadline(
    deadline_id: int,
    body: DeadlineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deadline = _get_deadline_or_404(deadline_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(deadline, key, value)
    db.commit()
    db.refresh(deadline)
    return deadline


@router.delete("/deadlines/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deadline(
    deadline_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deadline = _get_deadline_or_404(deadline_id, current_user, db)
    db.delete(deadline)
    db.commit()
