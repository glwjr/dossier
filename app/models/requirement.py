import enum
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.program import Program


class RequirementKind(str, enum.Enum):
    sop = "sop"
    cv = "cv"
    transcript = "transcript"
    gre = "gre"
    writing_sample = "writing_sample"
    fee = "fee"
    other = "other"


class RequirementStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"
    waived = "waived"


class Requirement(Base):
    __tablename__ = "requirements"

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String)
    kind: Mapped[RequirementKind] = mapped_column(SAEnum(RequirementKind))
    status: Mapped[RequirementStatus] = mapped_column(
        SAEnum(RequirementStatus), default=RequirementStatus.todo
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)

    program: Mapped["Program"] = relationship("Program", lazy="joined")
