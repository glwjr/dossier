"""replace_decision_status_with_accepted_waitlisted_rejected

Revision ID: c29a924fffec
Revises: 5bd386d65cfd
Create Date: 2026-06-27 22:58:12.950425

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c29a924fffec'
down_revision: Union[str, Sequence[str], None] = '5bd386d65cfd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_VALUES = ('researching', 'drafting', 'submitted', 'interview', 'accepted', 'waitlisted', 'rejected')
OLD_VALUES = ('researching', 'drafting', 'submitted', 'interview', 'decision')


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # SQLite doesn't enforce enums; just migrate any legacy 'decision' rows.
        bind.execute(sa.text("UPDATE programs SET status = 'accepted' WHERE status = 'decision'"))
        return

    # Postgres: create new enum, swap column, drop old enum.
    bind.execute(sa.text(
        "CREATE TYPE programstatus_new AS ENUM "
        "('researching', 'drafting', 'submitted', 'interview', 'accepted', 'waitlisted', 'rejected')"
    ))
    bind.execute(sa.text("UPDATE programs SET status = 'accepted' WHERE status = 'decision'"))
    bind.execute(sa.text(
        "ALTER TABLE programs "
        "ALTER COLUMN status TYPE programstatus_new "
        "USING status::text::programstatus_new"
    ))
    bind.execute(sa.text("DROP TYPE programstatus"))
    bind.execute(sa.text("ALTER TYPE programstatus_new RENAME TO programstatus"))


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # No way to know which accepted/waitlisted/rejected were originally 'decision';
        # leave rows as-is (values are still valid strings in SQLite).
        return

    bind.execute(sa.text(
        "CREATE TYPE programstatus_old AS ENUM "
        "('researching', 'drafting', 'submitted', 'interview', 'decision')"
    ))
    # Collapse outcome statuses back to 'decision'.
    bind.execute(sa.text(
        "UPDATE programs SET status = 'decision' "
        "WHERE status IN ('accepted', 'waitlisted', 'rejected')"
    ))
    bind.execute(sa.text(
        "ALTER TABLE programs "
        "ALTER COLUMN status TYPE programstatus_old "
        "USING status::text::programstatus_old"
    ))
    bind.execute(sa.text("DROP TYPE programstatus"))
    bind.execute(sa.text("ALTER TYPE programstatus_old RENAME TO programstatus"))
