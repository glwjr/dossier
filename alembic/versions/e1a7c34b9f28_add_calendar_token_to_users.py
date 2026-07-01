"""add_calendar_token_to_users

Revision ID: e1a7c34b9f28
Revises: d5c9b2e07f14
Create Date: 2026-06-30 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1a7c34b9f28'
down_revision: Union[str, Sequence[str], None] = 'd5c9b2e07f14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('calendar_token', sa.String(), nullable=True),
    )
    op.create_index(
        op.f('ix_users_calendar_token'),
        'users',
        ['calendar_token'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_users_calendar_token'), table_name='users')
    op.drop_column('users', 'calendar_token')
