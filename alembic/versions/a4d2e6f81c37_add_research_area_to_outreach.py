"""add_research_area_to_outreach

Revision ID: a4d2e6f81c37
Revises: f3a1c0d9e2b4
Create Date: 2026-06-30 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4d2e6f81c37'
down_revision: Union[str, Sequence[str], None] = 'f3a1c0d9e2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'outreach_contacts',
        sa.Column('research_area', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('outreach_contacts', 'research_area')
