from datetime import date, timedelta

from app.models.deadline import Deadline, DeadlineKind
from app.models.program import Program, ProgramStatus, Tier
from app.models.recommender import (
    ProgramRecommender,
    Recommender,
    RecommenderStatus,
)
from app.models.requirement import Requirement, RequirementKind, RequirementStatus
from app.models.user import User
from app.reminders import build_digest, collect_due_items

TODAY = date(2026, 1, 10)


def _user(db):
    u = User(email="rem@example.com", name="Rem")
    db.add(u)
    db.flush()
    return u


def _program(db, user):
    p = Program(
        user_id=user.id,
        school="MIT",
        department="EECS",
        degree="PhD",
        tier=Tier.reach,
        status=ProgramStatus.submitted,
    )
    db.add(p)
    db.flush()
    return p


def test_collect_includes_only_upcoming_undone(db_session):
    user = _user(db_session)
    prog = _program(db_session, user)
    db_session.add_all(
        [
            Deadline(
                program_id=prog.id,
                kind=DeadlineKind.application,
                due_date=TODAY + timedelta(days=3),
                done=False,
            ),
            Deadline(
                program_id=prog.id,
                kind=DeadlineKind.fellowship,
                due_date=TODAY + timedelta(days=40),
                done=False,
            ),  # outside window
            Deadline(
                program_id=prog.id,
                kind=DeadlineKind.fee_waiver,
                due_date=TODAY + timedelta(days=2),
                done=True,
            ),  # done
            Requirement(
                program_id=prog.id,
                label="SOP",
                kind=RequirementKind.sop,
                status=RequirementStatus.todo,
                due_date=TODAY + timedelta(days=5),
            ),
            Requirement(
                program_id=prog.id,
                label="Old",
                kind=RequirementKind.cv,
                status=RequirementStatus.done,
                due_date=TODAY + timedelta(days=1),
            ),
        ]
    )
    db_session.flush()

    items = collect_due_items(db_session, user, today=TODAY, window_days=14)
    labels = [i["title"] for i in items]
    assert "MIT" in labels[0] or items[0]["due"] == TODAY + timedelta(days=3)
    # 1 application deadline + 1 requirement = 2; others excluded
    assert len(items) == 2
    # sorted by due date ascending
    assert items[0]["due"] <= items[1]["due"]


def test_collect_includes_pending_letters(db_session):
    user = _user(db_session)
    prog = _program(db_session, user)
    chen = Recommender(user_id=user.id, name="Prof. Chen")
    osei = Recommender(user_id=user.id, name="Prof. Osei")
    db_session.add_all([chen, osei])
    db_session.flush()
    db_session.add_all(
        [
            ProgramRecommender(
                program_id=prog.id,
                recommender_id=chen.id,
                status=RecommenderStatus.asked,
                due_date=TODAY + timedelta(days=4),
            ),
            ProgramRecommender(
                program_id=prog.id,
                recommender_id=osei.id,
                status=RecommenderStatus.submitted,
                due_date=TODAY + timedelta(days=4),
            ),  # already submitted
        ]
    )
    db_session.flush()

    items = collect_due_items(db_session, user, today=TODAY, window_days=14)
    assert len(items) == 1
    assert "Chen" in items[0]["title"]


def test_build_digest_none_when_empty(db_session):
    user = _user(db_session)
    _program(db_session, user)
    assert build_digest(db_session, user, today=TODAY, window_days=14) is None


def test_build_digest_returns_subject_and_html(db_session):
    user = _user(db_session)
    prog = _program(db_session, user)
    db_session.add(
        Deadline(
            program_id=prog.id,
            kind=DeadlineKind.application,
            due_date=TODAY + timedelta(days=3),
            done=False,
        )
    )
    db_session.flush()

    result = build_digest(db_session, user, today=TODAY, window_days=14)
    assert result is not None
    subject, html = result
    assert "MIT" in html
    assert subject  # non-empty
