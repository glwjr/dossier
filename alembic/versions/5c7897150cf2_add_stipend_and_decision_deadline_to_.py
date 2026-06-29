"""add stipend and decision_deadline to programs

Revision ID: 5c7897150cf2
Revises: e7b2c5d8f1a3
Create Date: 2026-06-29 08:19:33.875007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c7897150cf2'
down_revision: Union[str, Sequence[str], None] = 'e7b2c5d8f1a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('programs', sa.Column('stipend', sa.Integer(), nullable=True))
    op.add_column('programs', sa.Column('decision_deadline', sa.Date(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('programs', 'decision_deadline')
    op.drop_column('programs', 'stipend')
