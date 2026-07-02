from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.program import Program
from app.models.requirement import Requirement, RequirementKind
from app.models.user import User
from app.ownership import get_program_or_404
from app.pagination import Pagination, pagination
from app.schemas.program import (
    ProgramCreate,
    ProgramImport,
    ProgramRead,
    ProgramUpdate,
)

router = APIRouter(prefix="/programs", tags=["programs"])

# Standard checklist auto-created when a program is added with
# ?with_default_requirements=true. (label, kind)
_DEFAULT_REQUIREMENTS = [
    ("Statement of Purpose", RequirementKind.sop),
    ("CV / Résumé", RequirementKind.cv),
    ("Transcripts", RequirementKind.transcript),
    ("Letters of recommendation", RequirementKind.other),
    ("Application fee", RequirementKind.fee),
]


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
    with_default_requirements: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    program = Program(**body.model_dump(), user_id=current_user.id)
    db.add(program)
    db.flush()
    if with_default_requirements:
        for label, kind in _DEFAULT_REQUIREMENTS:
            db.add(Requirement(program_id=program.id, label=label, kind=kind))
    db.commit()
    db.refresh(program)
    return program


@router.post(
    "/import", response_model=list[ProgramRead], status_code=status.HTTP_201_CREATED
)
def import_programs(
    body: ProgramImport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk-create programs (owner-scoped) — e.g. a pasted list from the UI."""
    created = [
        Program(**p.model_dump(), user_id=current_user.id) for p in body.programs
    ]
    db.add_all(created)
    db.commit()
    for c in created:
        db.refresh(c)
    return created


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
