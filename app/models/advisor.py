import enum
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.program import Program


class AdvisorResponse(str, enum.Enum):
    none = "none"
    positive = "positive"
    negative = "negative"
    meeting_scheduled = "meeting_scheduled"


class Advisor(Base):
    __tablename__ = "advisors"

    id: Mapped[int] = mapped_column(primary_key=True)
    program_id: Mapped[int] = mapped_column(
        ForeignKey("programs.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String)
    url: Mapped[str | None] = mapped_column(String)
    research_area: Mapped[str | None] = mapped_column(String)
    contacted_on: Mapped[date | None] = mapped_column(Date)
    response: Mapped[AdvisorResponse] = mapped_column(
        SAEnum(AdvisorResponse), default=AdvisorResponse.none
    )
    notes: Mapped[str | None] = mapped_column(Text)

    program: Mapped["Program"] = relationship("Program")
