from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager

from app.auth import get_current_user
from app.db import get_db
from app.models.outreach import OutreachContact
from app.models.program import Program
from app.models.user import User
from app.ownership import get_program_or_404
from app.schemas.outreach import (
    OutreachContactCreate,
    OutreachContactRead,
    OutreachContactUpdate,
    OutreachContactWithProgramRead,
)

router = APIRouter(tags=["outreach"])


@router.get("/outreach", response_model=list[OutreachContactWithProgramRead])
def list_all_outreach(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(OutreachContact)
        .join(Program, OutreachContact.program_id == Program.id)
        .options(contains_eager(OutreachContact.program))
        .where(Program.user_id == current_user.id)
        .order_by(OutreachContact.id)
    ).all()


def _get_contact_or_404(
    contact_id: int, current_user: User, db: Session
) -> OutreachContact:
    contact = db.scalar(
        select(OutreachContact)
        .join(Program, OutreachContact.program_id == Program.id)
        .where(
            OutreachContact.id == contact_id,
            Program.user_id == current_user.id,
        )
    )
    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found"
        )
    return contact


@router.get(
    "/programs/{program_id}/outreach",
    response_model=list[OutreachContactRead],
)
def list_contacts(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    return db.scalars(
        select(OutreachContact).where(OutreachContact.program_id == program_id)
    ).all()


@router.post(
    "/programs/{program_id}/outreach",
    response_model=OutreachContactRead,
    status_code=status.HTTP_201_CREATED,
)
def create_contact(
    program_id: int,
    body: OutreachContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    contact = OutreachContact(**body.model_dump(), program_id=program_id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.patch("/outreach/{contact_id}", response_model=OutreachContactRead)
def update_contact(
    contact_id: int,
    body: OutreachContactUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = _get_contact_or_404(contact_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/outreach/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    contact = _get_contact_or_404(contact_id, current_user, db)
    db.delete(contact)
    db.commit()
