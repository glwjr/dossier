from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager

from app.auth import get_current_user
from app.db import get_db
from app.models.advisor import Advisor
from app.models.program import Program
from app.models.user import User
from app.ownership import get_program_or_404
from app.pagination import Pagination, pagination
from app.schemas.advisor import (
    AdvisorCreate,
    AdvisorRead,
    AdvisorUpdate,
    AdvisorWithProgramRead,
)

router = APIRouter(tags=["advisors"])


@router.get("/advisors", response_model=list[AdvisorWithProgramRead])
def list_all_advisors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination),
):
    return db.scalars(
        select(Advisor)
        .join(Program, Advisor.program_id == Program.id)
        .options(contains_eager(Advisor.program))
        .where(Program.user_id == current_user.id)
        .order_by(Advisor.id)
        .limit(page.limit)
        .offset(page.offset)
    ).all()


def _get_advisor_or_404(advisor_id: int, current_user: User, db: Session) -> Advisor:
    advisor = db.scalar(
        select(Advisor)
        .join(Program, Advisor.program_id == Program.id)
        .where(
            Advisor.id == advisor_id,
            Program.user_id == current_user.id,
        )
    )
    if advisor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Advisor not found"
        )
    return advisor


@router.get(
    "/programs/{program_id}/advisors",
    response_model=list[AdvisorRead],
)
def list_advisors(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    return db.scalars(select(Advisor).where(Advisor.program_id == program_id)).all()


@router.post(
    "/programs/{program_id}/advisors",
    response_model=AdvisorRead,
    status_code=status.HTTP_201_CREATED,
)
def create_advisor(
    program_id: int,
    body: AdvisorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    advisor = Advisor(**body.model_dump(), program_id=program_id)
    db.add(advisor)
    db.commit()
    db.refresh(advisor)
    return advisor


@router.patch("/advisors/{advisor_id}", response_model=AdvisorRead)
def update_advisor(
    advisor_id: int,
    body: AdvisorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    advisor = _get_advisor_or_404(advisor_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(advisor, key, value)
    db.commit()
    db.refresh(advisor)
    return advisor


@router.delete("/advisors/{advisor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_advisor(
    advisor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    advisor = _get_advisor_or_404(advisor_id, current_user, db)
    db.delete(advisor)
    db.commit()
