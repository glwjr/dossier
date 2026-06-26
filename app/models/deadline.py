import enum
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DeadlineKind(str, enum.Enum):
    application = "application"
    fellowship = "fellowship"
    fee_waiver = "fee_waiver"


class Deadline(Base):
    __tablename__ = "deadlines"

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), index=True)
    kind: Mapped[DeadlineKind] = mapped_column(SAEnum(DeadlineKind))
    due_date: Mapped[date] = mapped_column(Date)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
