"""Ephemeral demo accounts.

`/auth/demo` clones a canonical template user's data into a throwaway account
so each visitor gets an isolated, fully editable copy. Expired accounts are
garbage-collected lazily (on the next demo login) via ``purge_expired_demo_users``.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, inspect, select
from sqlalchemy.orm import Session

from app.models.advisor import Advisor
from app.models.deadline import Deadline
from app.models.document import Document
from app.models.program import Program
from app.models.recommender import ProgramRecommender, Recommender
from app.models.requirement import Requirement
from app.models.user import User

# Columns never carried across when cloning a row: primary keys and DB-managed
# timestamps regenerate on insert, and calendar_token is unique (must stay null).
_SKIP_COLUMNS = {"id", "created_at", "updated_at", "calendar_token"}

# Program children keyed only by program_id — cloned by remapping that one FK.
_PROGRAM_CHILDREN = (Requirement, Deadline, Advisor, Document)


def _clone_row(row, **overrides):
    """Shallow-copy a mapped row, dropping skip columns and applying overrides.

    Uses the mapper so newly added columns are copied automatically.
    """
    data = {
        col.key: getattr(row, col.key)
        for col in inspect(row).mapper.column_attrs
        if col.key not in _SKIP_COLUMNS
    }
    data.update(overrides)
    return type(row)(**data)


def clone_user_data(db: Session, template: User, dest: User) -> None:
    """Deep-copy every program, recommender, and their children from ``template``
    to ``dest``, remapping foreign keys. Caller commits.
    """
    # Recommenders first: the program_recommenders junction points at them.
    rec_id_map: dict[int, int] = {}
    for rec in db.scalars(
        select(Recommender).where(Recommender.user_id == template.id)
    ):
        clone = _clone_row(rec, user_id=dest.id)
        db.add(clone)
        db.flush()  # need the generated id for the junction remap
        rec_id_map[rec.id] = clone.id

    for prog in db.scalars(select(Program).where(Program.user_id == template.id)):
        prog_clone = _clone_row(prog, user_id=dest.id)
        db.add(prog_clone)
        db.flush()  # need the generated program id for children

        for model in _PROGRAM_CHILDREN:
            for child in db.scalars(select(model).where(model.program_id == prog.id)):
                db.add(_clone_row(child, program_id=prog_clone.id))

        for pr in db.scalars(
            select(ProgramRecommender).where(ProgramRecommender.program_id == prog.id)
        ):
            db.add(
                _clone_row(
                    pr,
                    program_id=prog_clone.id,
                    recommender_id=rec_id_map[pr.recommender_id],
                )
            )


def _delete_users(db: Session, user_ids) -> None:
    """Delete the given users and all of their data in FK-safe order.

    ``user_ids`` may be a list of ids or a scalar SELECT of ids. Mirrors the
    order in ``delete_me`` so it works regardless of cascade configuration.
    """
    program_ids = select(Program.id).where(Program.user_id.in_(user_ids))

    db.execute(delete(Requirement).where(Requirement.program_id.in_(program_ids)))
    db.execute(delete(Deadline).where(Deadline.program_id.in_(program_ids)))
    db.execute(delete(Advisor).where(Advisor.program_id.in_(program_ids)))
    db.execute(delete(Document).where(Document.program_id.in_(program_ids)))
    db.execute(
        delete(ProgramRecommender).where(ProgramRecommender.program_id.in_(program_ids))
    )
    db.execute(delete(Program).where(Program.user_id.in_(user_ids)))
    db.execute(delete(Recommender).where(Recommender.user_id.in_(user_ids)))
    db.execute(delete(User).where(User.id.in_(user_ids)))


def purge_expired_demo_users(db: Session, ttl_hours: int = 24) -> None:
    """Delete demo users older than ``ttl_hours`` and all of their data.

    Caller-safe to run opportunistically; commits its own transaction.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=ttl_hours)
    expired = select(User.id).where(User.is_demo, User.created_at < cutoff)
    _delete_users(db, expired)
    db.commit()


def purge_surplus_demo_users(db: Session, max_users: int) -> None:
    """Evict the oldest demo accounts so no more than ``max_users`` remain.

    A hard bloat ceiling in case demo traffic outpaces the TTL. Commits its own
    transaction; a no-op when under the cap.
    """
    live = db.scalar(select(func.count()).select_from(User).where(User.is_demo)) or 0
    surplus = live - max_users
    if surplus <= 0:
        return
    # Materialize ids: a LIMITed subquery inside DELETE ... IN isn't portable.
    oldest = list(
        db.scalars(
            select(User.id).where(User.is_demo).order_by(User.created_at).limit(surplus)
        )
    )
    _delete_users(db, oldest)
    db.commit()
