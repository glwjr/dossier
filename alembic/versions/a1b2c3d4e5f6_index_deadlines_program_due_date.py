"""index deadlines(program_id, due_date)

Revision ID: a1b2c3d4e5f6
Revises: f1b8d2c6a9e3
Create Date: 2026-07-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f1b8d2c6a9e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Composite index for the dashboard's per-program earliest-undone-deadline
    # aggregate and the per-program list ordered by due_date. Leading with
    # program_id keeps it usable for the existing program_id equality filters
    # too, so it supersedes the single-column index created with the table.
    op.create_index(
        'ix_deadlines_program_id_due_date',
        'deadlines',
        ['program_id', 'due_date'],
    )
    op.drop_index('ix_deadlines_program_id', table_name='deadlines')


def downgrade() -> None:
    op.create_index('ix_deadlines_program_id', 'deadlines', ['program_id'])
    op.drop_index('ix_deadlines_program_id_due_date', table_name='deadlines')
