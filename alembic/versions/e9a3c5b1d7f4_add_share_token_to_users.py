"""add_share_token_to_users

Revision ID: e9a3c5b1d7f4
Revises: d7f2a1c4e8b0
Create Date: 2026-07-02 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9a3c5b1d7f4'
down_revision: Union[str, Sequence[str], None] = 'd7f2a1c4e8b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('share_token', sa.String(), nullable=True))
    op.create_index(
        op.f('ix_users_share_token'), 'users', ['share_token'], unique=True
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_users_share_token'), table_name='users')
    op.drop_column('users', 'share_token')
