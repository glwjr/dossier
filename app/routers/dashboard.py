from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models.deadline import Deadline
from app.models.program import Program
from app.models.requirement import Requirement, RequirementStatus
from app.models.user import User
from app.schemas.dashboard import DashboardEntry

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=list[DashboardEntry])
def dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()

    programs = db.scalars(
        select(Program).where(Program.user_id == current_user.id)
    ).all()

    if not programs:
        return []

    program_ids = [p.id for p in programs]

    # Query 1: completion stats — total requirements and done count per program
    completion_rows = db.execute(
        select(
            Requirement.program_id,
            func.count().label("total"),
            func.sum(
                case((Requirement.status == RequirementStatus.done, 1), else_=0)
            ).label("done_count"),
        )
        .where(Requirement.program_id.in_(program_ids))
        .group_by(Requirement.program_id)
    ).all()

    # Query 2: earliest undone future deadline per program
    next_deadline_rows = db.execute(
        select(
            Deadline.program_id,
            func.min(Deadline.due_date).label("next_deadline"),
        )
        .where(
            Deadline.program_id.in_(program_ids),
            Deadline.due_date >= today,
            Deadline.done.is_(False),
        )
        .group_by(Deadline.program_id)
    ).all()

    # Query 3: blocking requirements (todo or in_progress) across all programs
    blocking_reqs = db.scalars(
        select(Requirement).where(
            Requirement.program_id.in_(program_ids),
            Requirement.status.in_(
                [RequirementStatus.todo, RequirementStatus.in_progress]
            ),
        )
    ).all()

    # Build O(1) lookup maps from the aggregate results
    completion_by_pid = {row.program_id: row for row in completion_rows}
    next_dl_by_pid = {row.program_id: row.next_deadline for row in next_deadline_rows}
    blocking_by_pid: dict[int, list] = {}
    for req in blocking_reqs:
        blocking_by_pid.setdefault(req.program_id, []).append(req)

    return [
        DashboardEntry(
            program=program,
            completion_pct=_pct(completion_by_pid.get(program.id)),
            next_deadline=next_dl_by_pid.get(program.id),
            days_remaining=(
                (next_dl_by_pid[program.id] - today).days
                if program.id in next_dl_by_pid
                else None
            ),
            blocking_requirements=blocking_by_pid.get(program.id, []),
        )
        for program in programs
    ]


def _pct(row) -> float:
    if row is None or row.total == 0:
        return 0.0
    return round(row.done_count / row.total * 100, 1)
