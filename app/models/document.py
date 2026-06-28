import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class DocumentKind(str, enum.Enum):
    sop = "sop"
    personal_statement = "personal_statement"
    cv = "cv"
    writing_sample = "writing_sample"
    other = "other"


class DocumentStatus(str, enum.Enum):
    draft = "draft"
    in_progress = "in_progress"
    final = "final"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[DocumentKind] = mapped_column(SAEnum(DocumentKind))
    title: Mapped[str] = mapped_column(String)
    status: Mapped[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus), default=DocumentStatus.draft
    )
    url: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
    program: Mapped["Program"] = relationship("Program", lazy="joined")
