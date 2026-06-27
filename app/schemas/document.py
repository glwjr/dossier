from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentKind, DocumentStatus


class DocumentCreate(BaseModel):
    kind: DocumentKind
    title: str
    status: DocumentStatus = DocumentStatus.draft
    notes: str | None = None


class DocumentUpdate(BaseModel):
    kind: DocumentKind | None = None
    title: str | None = None
    status: DocumentStatus | None = None
    notes: str | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    kind: DocumentKind
    title: str
    status: DocumentStatus
    notes: str | None
    updated_at: datetime
