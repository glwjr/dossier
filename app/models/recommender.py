import enum
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.program import Program


class RecommenderStatus(str, enum.Enum):
    asked = "asked"
    confirmed = "confirmed"
    submitted = "submitted"


class Recommender(Base):
    __tablename__ = "recommenders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String)
    institution: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text)
    program_assignments: Mapped[list["ProgramRecommender"]] = relationship(
        "ProgramRecommender", lazy="selectin"
    )


class ProgramRecommender(Base):
    __tablename__ = "program_recommenders"

    id: Mapped[int] = mapped_column(primary_key=True)
    recommender_id: Mapped[int] = mapped_column(
        ForeignKey("recommenders.id"), index=True
    )
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"), index=True)
    status: Mapped[RecommenderStatus] = mapped_column(
        SAEnum(RecommenderStatus), default=RecommenderStatus.asked
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)

    recommender: Mapped["Recommender"] = relationship(
        "Recommender", overlaps="program_assignments"
    )
    program: Mapped["Program"] = relationship("Program", lazy="joined")
