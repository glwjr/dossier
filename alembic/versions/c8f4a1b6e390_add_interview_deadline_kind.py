"""add_interview_deadline_kind

Revision ID: c8f4a1b6e390
Revises: b7e3f1a92d05
Create Date: 2026-06-30 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f4a1b6e390'
down_revision: Union[str, Sequence[str], None] = 'b7e3f1a92d05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # SQLite doesn't enforce enums; values are plain strings.
        return
    # Postgres: create a new enum with 'interview' appended, swap the column,
    # drop the old type, rename. Runs inside Alembic's transaction.
    bind.execute(sa.text(
        "CREATE TYPE deadlinekind_new AS ENUM "
        "('application', 'fellowship', 'fee_waiver', 'interview')"
    ))
    bind.execute(sa.text(
        "ALTER TABLE deadlines "
        "ALTER COLUMN kind TYPE deadlinekind_new "
        "USING kind::text::deadlinekind_new"
    ))
    bind.execute(sa.text("DROP TYPE deadlinekind"))
    bind.execute(sa.text("ALTER TYPE deadlinekind_new RENAME TO deadlinekind"))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        return
    bind.execute(sa.text(
        "CREATE TYPE deadlinekind_old AS ENUM "
        "('application', 'fellowship', 'fee_waiver')"
    ))
    # Drop any interview rows before narrowing the enum (they can't be represented).
    bind.execute(sa.text("DELETE FROM deadlines WHERE kind::text = 'interview'"))
    bind.execute(sa.text(
        "ALTER TABLE deadlines "
        "ALTER COLUMN kind TYPE deadlinekind_old "
        "USING kind::text::deadlinekind_old"
    ))
    bind.execute(sa.text("DROP TYPE deadlinekind"))
    bind.execute(sa.text("ALTER TYPE deadlinekind_old RENAME TO deadlinekind"))
