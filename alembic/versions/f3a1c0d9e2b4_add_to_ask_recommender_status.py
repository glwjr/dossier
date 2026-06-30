"""add_to_ask_recommender_status

Revision ID: f3a1c0d9e2b4
Revises: dc834bead44f
Create Date: 2026-06-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a1c0d9e2b4'
down_revision: Union[str, Sequence[str], None] = 'dc834bead44f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # SQLite doesn't enforce enums; values are plain strings, nothing to do.
        return

    # Postgres: create new enum with 'to_ask' first, swap the column, drop old,
    # rename. Done via a new type (rather than ALTER TYPE ... ADD VALUE) so it
    # runs inside Alembic's transaction and the value ordering is controlled.
    bind.execute(sa.text(
        "CREATE TYPE recommenderstatus_new AS ENUM "
        "('to_ask', 'asked', 'confirmed', 'submitted')"
    ))
    bind.execute(sa.text(
        "ALTER TABLE program_recommenders "
        "ALTER COLUMN status TYPE recommenderstatus_new "
        "USING status::text::recommenderstatus_new"
    ))
    bind.execute(sa.text("DROP TYPE recommenderstatus"))
    bind.execute(sa.text("ALTER TYPE recommenderstatus_new RENAME TO recommenderstatus"))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        return

    bind.execute(sa.text(
        "CREATE TYPE recommenderstatus_old AS ENUM "
        "('asked', 'confirmed', 'submitted')"
    ))
    # Collapse any pre-ask rows back to 'asked' before narrowing the enum.
    bind.execute(sa.text(
        "UPDATE program_recommenders SET status = 'asked' "
        "WHERE status::text = 'to_ask'"
    ))
    bind.execute(sa.text(
        "ALTER TABLE program_recommenders "
        "ALTER COLUMN status TYPE recommenderstatus_old "
        "USING status::text::recommenderstatus_old"
    ))
    bind.execute(sa.text("DROP TYPE recommenderstatus"))
    bind.execute(sa.text("ALTER TYPE recommenderstatus_old RENAME TO recommenderstatus"))
