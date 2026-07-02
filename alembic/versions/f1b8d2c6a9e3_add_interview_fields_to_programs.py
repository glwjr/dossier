"""add_interview_fields_to_programs

Revision ID: f1b8d2c6a9e3
Revises: e9a3c5b1d7f4
Create Date: 2026-07-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1b8d2c6a9e3'
down_revision: Union[str, Sequence[str], None] = 'e9a3c5b1d7f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('programs', sa.Column('interview_date', sa.Date(), nullable=True))
    op.add_column('programs', sa.Column('interview_notes', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('programs', 'interview_notes')
    op.drop_column('programs', 'interview_date')
