from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentKind, DocumentStatus
from app.schemas.validators import Notes, ShortStr, WebUrl


class DocumentCreate(BaseModel):
    kind: DocumentKind
    title: ShortStr
    status: DocumentStatus = DocumentStatus.draft
    url: WebUrl | None = None
    notes: Notes | None = None


class DocumentUpdate(BaseModel):
    kind: DocumentKind | None = None
    title: ShortStr | None = None
    status: DocumentStatus | None = None
    url: WebUrl | None = None
    notes: Notes | None = None


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program_id: int
    kind: DocumentKind
    title: str
    status: DocumentStatus
    url: str | None
    notes: str | None
    updated_at: datetime


class ProgramSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school: str
    department: str


class DocumentWithProgramRead(DocumentRead):
    program: ProgramSummary
