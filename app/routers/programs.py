from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.program import Program
from app.models.user import User
from app.ownership import get_program_or_404
from app.pagination import Pagination, pagination
from app.schemas.program import ProgramCreate, ProgramRead, ProgramUpdate

router = APIRouter(prefix="/programs", tags=["programs"])


@router.get("", response_model=list[ProgramRead])
def list_programs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination),
):
    return db.scalars(
        select(Program)
        .where(Program.user_id == current_user.id)
        .limit(page.limit)
        .offset(page.offset)
    ).all()


@router.post("", response_model=ProgramRead, status_code=status.HTTP_201_CREATED)
def create_program(
    body: ProgramCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    program = Program(**body.model_dump(), user_id=current_user.id)
    db.add(program)
    db.commit()
    db.refresh(program)
    return program


@router.get("/{program_id}", response_model=ProgramRead)
def get_program(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_program_or_404(program_id, current_user, db)


@router.patch("/{program_id}", response_model=ProgramRead)
def update_program(
    program_id: int,
    body: ProgramUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    program = get_program_or_404(program_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(program, key, value)
    db.commit()
    db.refresh(program)
    return program


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_program(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    program = get_program_or_404(program_id, current_user, db)
    db.delete(program)
    db.commit()
