"""make timestamp columns timezone-aware

Revision ID: e7b2c5d8f1a3
Revises: d1f4a7c2b9e0
Create Date: 2026-06-29 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7b2c5d8f1a3'
down_revision: Union[str, Sequence[str], None] = 'd1f4a7c2b9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (table, column) pairs that store creation/update timestamps.
_COLUMNS = [
    ("programs", "created_at"),
    ("programs", "updated_at"),
    ("users", "created_at"),
    ("documents", "updated_at"),
]


def upgrade() -> None:
    bind = op.get_bind()
    # SQLite has no real timezone-aware type; the column affinity is unchanged,
    # so there is nothing to migrate there.
    if bind.dialect.name == "sqlite":
        return

    # Existing naive values were written by now() on a UTC server; interpret
    # them as UTC when widening to timestamptz.
    for table, column in _COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.DateTime(timezone=True),
            postgresql_using=f"{column} AT TIME ZONE 'UTC'",
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        return

    for table, column in _COLUMNS:
        op.alter_column(
            table,
            column,
            type_=sa.DateTime(timezone=False),
            postgresql_using=f"{column} AT TIME ZONE 'UTC'",
        )
