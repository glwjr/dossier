from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.document import Document
from app.models.program import Program
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentRead, DocumentUpdate

router = APIRouter(tags=["documents"])


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


def _get_document_or_404(doc_id: int, current_user: User, db: Session) -> Document:
    doc = db.scalar(
        select(Document)
        .join(Program, Document.program_id == Program.id)
        .where(Document.id == doc_id, Program.user_id == current_user.id)
    )
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return doc


@router.get("/programs/{program_id}/documents", response_model=list[DocumentRead])
def list_documents(
    program_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_program_or_404(program_id, current_user, db)
    return db.scalars(select(Document).where(Document.program_id == program_id)).all()


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
    _get_program_or_404(program_id, current_user, db)
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
    doc = _get_document_or_404(doc_id, current_user, db)
    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(doc, key, value)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = _get_document_or_404(doc_id, current_user, db)
    db.delete(doc)
    db.commit()
