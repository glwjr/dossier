"""add_is_demo_to_users

Revision ID: a9c1d3e5f7b2
Revises: f2b8c6d1a047
Create Date: 2026-07-01 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9c1d3e5f7b2'
down_revision: Union[str, Sequence[str], None] = 'f2b8c6d1a047'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'is_demo',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.create_index(op.f('ix_users_is_demo'), 'users', ['is_demo'])


def downgrade() -> None:
    op.drop_index(op.f('ix_users_is_demo'), table_name='users')
    op.drop_column('users', 'is_demo')
