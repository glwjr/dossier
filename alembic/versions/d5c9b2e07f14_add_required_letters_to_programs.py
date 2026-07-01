"""add_required_letters_to_programs

Revision ID: d5c9b2e07f14
Revises: c8f4a1b6e390
Create Date: 2026-06-30 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5c9b2e07f14'
down_revision: Union[str, Sequence[str], None] = 'c8f4a1b6e390'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'programs',
        sa.Column('required_letters', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('programs', 'required_letters')
