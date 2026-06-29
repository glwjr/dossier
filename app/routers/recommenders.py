from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.db import get_db
from app.models.program import Program
from app.models.recommender import ProgramRecommender, Recommender
from app.models.user import User
from app.ownership import get_program_or_404
from app.schemas.recommender import (
    ProgramRecommenderCreate,
    ProgramRecommenderRead,
    ProgramRecommenderUpdate,
    RecommenderCreate,
    RecommenderRead,
    RecommenderUpdate,
    RecommenderWithAssignmentsRead,
)

router = APIRouter(tags=["recommenders"])


def _get_recommender_or_404(
    rec_id: int, current_user: User, db: Session
) -> Recommender:
    rec = db.scalar(
        select(Recommender).where(
            Recommender.id == rec_id,
            Recommender.user_id == current_user.id,
        )
    )
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Recommender not found"
        )
    return rec


def _get_pr_or_404(
    program_id: int, recommender_id: int, current_user: User, db: Session
) -> ProgramRecommender:
    pr = db.scalar(
        select(ProgramRecommender)
        .join(Program, ProgramRecommender.program_id == Program.id)
        .where(
            ProgramRecommender.program_id == program_id,
            ProgramRecommender.recommender_id == recommender_id,
            Program.user_id == current_user.id,
        )
    )
    if pr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found"
        )
    return pr


# --- Top-level recommender CRUD ---


@router.get("/recommenders", response_model=list[RecommenderWithAssignmentsRead])
def list_recommenders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Recommender)
        .where(Recommender.user_id == current_user.id)
        .options(
            selectinload(Recommender.program_assignments).joinedload(
                ProgramRecommender.program
            )
        )
    ).all()


@router.post(
    "/recommenders",
    response_model=RecommenderRead,
    status_code=status.HTTP_201_CREATED,
)
def create_recommender(
    body: RecommenderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = Recommender(**body.model_dump(), user_id=current_user.id)
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/recommenders/{rec_id}", response_model=RecommenderRead)
def get_recommender(
    rec_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_recommender_or_404(rec_id, current_user, db)


@router.patch("/recommenders/{rec_id}", response_model=RecommenderRead)
def update_recommender(
    rec_id: int,
    body: RecommenderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommender_or_404(rec_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(rec, key, value)
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/recommenders/{rec_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recommender(
    rec_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = _get_recommender_or_404(rec_id, current_user, db)
    db.execute(
        sa_delete(ProgramRecommender).where(ProgramRecommender.recommender_id == rec_id)
    )
    db.delete(rec)
    db.commit()


# --- Program-recommender junction ---


@router.get(
    "/programs/{program_id}/recommenders",
    response_model=list[ProgramRecommenderRead],
)
def list_program_recommenders(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    return db.scalars(
        select(ProgramRecommender).where(ProgramRecommender.program_id == program_id)
    ).all()


@router.post(
    "/programs/{program_id}/recommenders",
    response_model=ProgramRecommenderRead,
    status_code=status.HTTP_201_CREATED,
)
def assign_recommender(
    program_id: int,
    body: ProgramRecommenderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    _get_recommender_or_404(body.recommender_id, current_user, db)

    existing = db.scalar(
        select(ProgramRecommender).where(
            ProgramRecommender.program_id == program_id,
            ProgramRecommender.recommender_id == body.recommender_id,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Recommender already assigned to this program",
        )

    pr = ProgramRecommender(**body.model_dump(), program_id=program_id)
    db.add(pr)
    db.commit()
    db.refresh(pr)
    return pr


@router.patch(
    "/programs/{program_id}/recommenders/{recommender_id}",
    response_model=ProgramRecommenderRead,
)
def update_program_recommender(
    program_id: int,
    recommender_id: int,
    body: ProgramRecommenderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pr = _get_pr_or_404(program_id, recommender_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(pr, key, value)
    db.commit()
    db.refresh(pr)
    return pr


@router.delete(
    "/programs/{program_id}/recommenders/{recommender_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unassign_recommender(
    program_id: int,
    recommender_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pr = _get_pr_or_404(program_id, recommender_id, current_user, db)
    db.delete(pr)
    db.commit()
