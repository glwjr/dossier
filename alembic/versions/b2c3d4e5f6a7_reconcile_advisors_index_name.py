"""reconcile advisors program_id index name

The outreach->advisors rename (b7e3f1a92d05) renamed the index on Postgres via
ALTER INDEX, but on SQLite `rename_table` leaves the index attached under its
original name `ix_outreach_contacts_program_id`. That left SQLite dev databases
with an index name the model (`ix_advisors_program_id`) doesn't expect, which
`alembic check` flags. Reconcile both dialects by name, idempotently: ensure
the correctly-named index exists and drop the stale one if present.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-03 13:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = {ix['name'] for ix in sa.inspect(bind).get_indexes('advisors')}
    if 'ix_advisors_program_id' not in existing:
        op.create_index('ix_advisors_program_id', 'advisors', ['program_id'])
    if 'ix_outreach_contacts_program_id' in existing:
        op.drop_index('ix_outreach_contacts_program_id', table_name='advisors')


def downgrade() -> None:
    # No-op: the target state (an index on advisors.program_id) is unchanged;
    # this migration only reconciles its name, so there is nothing to revert.
    pass
