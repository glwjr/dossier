import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Tier(str, enum.Enum):
    reach = "reach"
    match = "match"
    likely = "likely"


class ProgramStatus(str, enum.Enum):
    researching = "researching"
    drafting = "drafting"
    submitted = "submitted"
    interview = "interview"
    accepted = "accepted"
    waitlisted = "waitlisted"
    rejected = "rejected"


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    school: Mapped[str] = mapped_column(String)
    department: Mapped[str] = mapped_column(String)
    degree: Mapped[str] = mapped_column(String)
    url: Mapped[str | None] = mapped_column(String)
    tier: Mapped[Tier] = mapped_column(SAEnum(Tier))
    status: Mapped[ProgramStatus] = mapped_column(
        SAEnum(ProgramStatus), default=ProgramStatus.researching
    )
    location: Mapped[str | None] = mapped_column(String)
    app_fee: Mapped[int | None] = mapped_column(Integer)
    stipend: Mapped[int | None] = mapped_column(Integer)
    decision_deadline: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
