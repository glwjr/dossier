from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager

from app.auth import get_current_user
from app.db import get_db
from app.models.program import Program
from app.models.requirement import Requirement
from app.models.user import User
from app.ownership import get_program_or_404
from app.schemas.requirement import (
    RequirementCreate,
    RequirementRead,
    RequirementUpdate,
    RequirementWithProgramRead,
)

router = APIRouter(tags=["requirements"])


@router.get("/requirements", response_model=list[RequirementWithProgramRead])
def list_all_requirements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Requirement)
        .join(Program, Requirement.program_id == Program.id)
        .options(contains_eager(Requirement.program))
        .where(Program.user_id == current_user.id)
        .order_by(Requirement.id)
    ).all()


def _get_requirement_or_404(
    req_id: int, current_user: User, db: Session
) -> Requirement:
    """Load a requirement; verify ownership via a join through the parent program."""
    req = db.scalar(
        select(Requirement)
        .join(Program, Requirement.program_id == Program.id)
        .where(Requirement.id == req_id, Program.user_id == current_user.id)
    )
    if req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Requirement not found"
        )
    return req


@router.get("/programs/{program_id}/requirements", response_model=list[RequirementRead])
def list_requirements(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    return db.scalars(
        select(Requirement).where(Requirement.program_id == program_id)
    ).all()


@router.post(
    "/programs/{program_id}/requirements",
    response_model=RequirementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_requirement(
    program_id: int,
    body: RequirementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    req = Requirement(**body.model_dump(), program_id=program_id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.patch("/requirements/{req_id}", response_model=RequirementRead)
def update_requirement(
    req_id: int,
    body: RequirementUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = _get_requirement_or_404(req_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(req, key, value)
    db.commit()
    db.refresh(req)
    return req


@router.delete("/requirements/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_requirement(
    req_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = _get_requirement_or_404(req_id, current_user, db)
    db.delete(req)
    db.commit()
