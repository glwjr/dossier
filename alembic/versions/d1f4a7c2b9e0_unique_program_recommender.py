"""add unique constraint to program_recommenders

Revision ID: d1f4a7c2b9e0
Revises: c29a924fffec
Create Date: 2026-06-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1f4a7c2b9e0'
down_revision: Union[str, Sequence[str], None] = 'c29a924fffec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CONSTRAINT = "uq_program_recommender"

# Delete duplicate (program_id, recommender_id) rows, keeping the lowest id,
# so the unique constraint can be created cleanly.
_DEDUPE = sa.text(
    "DELETE FROM program_recommenders WHERE id NOT IN ("
    " SELECT MIN(id) FROM program_recommenders"
    " GROUP BY program_id, recommender_id)"
)


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(_DEDUPE)

    if bind.dialect.name == "sqlite":
        # SQLite cannot ALTER TABLE to add a constraint; rebuild via batch mode.
        with op.batch_alter_table("program_recommenders") as batch_op:
            batch_op.create_unique_constraint(
                _CONSTRAINT, ["program_id", "recommender_id"]
            )
        return

    op.create_unique_constraint(
        _CONSTRAINT, "program_recommenders", ["program_id", "recommender_id"]
    )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("program_recommenders") as batch_op:
            batch_op.drop_constraint(_CONSTRAINT, type_="unique")
        return

    op.drop_constraint(_CONSTRAINT, "program_recommenders", type_="unique")
