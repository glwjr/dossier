"""add location to programs

Revision ID: dc834bead44f
Revises: 5c7897150cf2
Create Date: 2026-06-29 08:39:01.682405

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc834bead44f'
down_revision: Union[str, Sequence[str], None] = '5c7897150cf2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('programs', sa.Column('location', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('programs', 'location')
