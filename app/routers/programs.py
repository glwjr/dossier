from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.program import Program
from app.models.user import User
from app.schemas.program import ProgramCreate, ProgramRead, ProgramUpdate

router = APIRouter(prefix="/programs", tags=["programs"])


def _get_program_or_404(program_id: int, current_user: User, db: Session) -> Program:
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


@router.get("", response_model=list[ProgramRead])
def list_programs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(select(Program).where(Program.user_id == current_user.id)).all()


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
    return _get_program_or_404(program_id, current_user, db)


@router.patch("/{program_id}", response_model=ProgramRead)
def update_program(
    program_id: int,
    body: ProgramUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    program = _get_program_or_404(program_id, current_user, db)
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
    program = _get_program_or_404(program_id, current_user, db)
    db.delete(program)
    db.commit()
