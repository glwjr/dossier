"""sqlite cascade for program child tables

Backfills ON DELETE CASCADE on the program_id foreign keys for SQLite, which
the original cascade migration (5bd386d65cfd) skipped because SQLite can't
ALTER unnamed constraints. Postgres already has these cascades, so this is a
no-op there. Brings local/dev SQLite in line with production.

Revision ID: f2b8c6d1a047
Revises: e1a7c34b9f28
Create Date: 2026-06-30 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f2b8c6d1a047'
down_revision: Union[str, Sequence[str], None] = 'e1a7c34b9f28'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = [
    "requirements",
    "deadlines",
    "advisors",
    "documents",
    "program_recommenders",
]

# Give the reflected (unnamed) program_id FK a deterministic name so batch mode
# can drop it and recreate it with the cascade rule.
_NAMING = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        return
    for table in _TABLES:
        fk = f"fk_{table}_program_id_programs"
        with op.batch_alter_table(
            table, naming_convention=_NAMING
        ) as batch_op:
            batch_op.drop_constraint(fk, type_="foreignkey")
            batch_op.create_foreign_key(
                fk, "programs", ["program_id"], ["id"], ondelete="CASCADE"
            )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        return
    for table in _TABLES:
        fk = f"fk_{table}_program_id_programs"
        with op.batch_alter_table(
            table, naming_convention=_NAMING
        ) as batch_op:
            batch_op.drop_constraint(fk, type_="foreignkey")
            batch_op.create_foreign_key(
                fk, "programs", ["program_id"], ["id"]
            )
