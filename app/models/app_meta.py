from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AppMeta(Base):
    """Single-row-per-key store for small operational values.

    Currently holds the seeded demo-template version so deploys can detect
    when the sample content changed and rebuild the template.
    """

    __tablename__ = "app_meta"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(String)
