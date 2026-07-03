from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session, contains_eager

from app.auth import get_current_user
from app.crud import apply_update
from app.db import get_db
from app.models.document import Document
from app.models.program import Program
from app.models.user import User
from app.ownership import get_owned_child_or_404, get_program_or_404
from app.pagination import Pagination, pagination
from app.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    DocumentWithProgramRead,
)

router = APIRouter(tags=["documents"])


@router.get("/documents", response_model=list[DocumentWithProgramRead])
def list_all_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination),
):
    return db.scalars(
        select(Document)
        .join(Program, Document.program_id == Program.id)
        .options(contains_eager(Document.program))
        .where(Program.user_id == current_user.id)
        .order_by(Document.program_id, Document.id)
        .limit(page.limit)
        .offset(page.offset)
    ).all()


@router.get("/programs/{program_id}/documents", response_model=list[DocumentRead])
def list_documents(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: Pagination = Depends(pagination),
):
    get_program_or_404(program_id, current_user, db)
    return db.scalars(
        select(Document)
        .where(Document.program_id == program_id)
        .order_by(Document.id)
        .limit(page.limit)
        .offset(page.offset)
    ).all()


@router.post(
    "/programs/{program_id}/documents",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    program_id: int,
    body: DocumentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_program_or_404(program_id, current_user, db)
    doc = Document(**body.model_dump(), program_id=program_id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.patch("/documents/{doc_id}", response_model=DocumentRead)
def update_document(
    doc_id: int,
    body: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_owned_child_or_404(Document, doc_id, current_user, db)
    apply_update(doc, body)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_owned_child_or_404(Document, doc_id, current_user, db)
    db.delete(doc)
    db.commit()
