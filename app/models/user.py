from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    # Opaque secret in the private .ics calendar feed URL; null until generated.
    calendar_token: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    # Ephemeral demo accounts: created by /auth/demo, garbage-collected by TTL.
    is_demo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false(), default=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
