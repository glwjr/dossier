"""add cascade delete to program child tables

Revision ID: 5bd386d65cfd
Revises: 61b9ccfe8366
Create Date: 2026-06-27 22:03:29.379603

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bd386d65cfd'
down_revision: Union[str, Sequence[str], None] = '61b9ccfe8366'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = [
    "deadlines",
    "documents",
    "outreach_contacts",
    "program_recommenders",
    "requirements",
]


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        # SQLite can't ALTER TABLE to rename FK constraints, and our existing
        # FKs are unnamed so batch mode can't target them. Clean up any
        # orphaned child rows that were left behind by prior deletes instead.
        for table in _TABLES:
            bind.execute(
                sa.text(
                    f"DELETE FROM {table}"
                    " WHERE program_id NOT IN (SELECT id FROM programs)"
                )
            )
        return

    # Postgres: FK names follow the auto-generated convention
    for table in _TABLES:
        op.drop_constraint(f"{table}_program_id_fkey", table, type_="foreignkey")
        op.create_foreign_key(
            f"{table}_program_id_fkey",
            table,
            "programs",
            ["program_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        return

    for table in reversed(_TABLES):
        op.drop_constraint(f"{table}_program_id_fkey", table, type_="foreignkey")
        op.create_foreign_key(
            f"{table}_program_id_fkey",
            table,
            "programs",
            ["program_id"],
            ["id"],
        )
