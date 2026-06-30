"""rename_outreach_to_advisors

Revision ID: b7e3f1a92d05
Revises: a4d2e6f81c37
Create Date: 2026-06-30 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e3f1a92d05'
down_revision: Union[str, Sequence[str], None] = 'a4d2e6f81c37'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    op.rename_table('outreach_contacts', 'advisors')
    if bind.dialect.name == 'sqlite':
        # SQLite: the index is recreated with the table; the enum is a plain
        # string column, so only the table name needs changing.
        return
    op.execute('ALTER INDEX ix_outreach_contacts_program_id RENAME TO ix_advisors_program_id')
    op.execute('ALTER TYPE outreachresponse RENAME TO advisorresponse')


def downgrade() -> None:
    bind = op.get_bind()
    op.rename_table('advisors', 'outreach_contacts')
    if bind.dialect.name == 'sqlite':
        return
    op.execute('ALTER INDEX ix_advisors_program_id RENAME TO ix_outreach_contacts_program_id')
    op.execute('ALTER TYPE advisorresponse RENAME TO outreachresponse')
