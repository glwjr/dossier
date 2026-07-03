"""Unit tests for the shared ownership helpers.

The end-to-end isolation tests (test_requirements.py, test_deadlines.py, etc.)
already exercise these through the routers; this file locks in the generic
helper's contract directly — 404 detail wording and cross-user rejection.
"""

import pytest
from fastapi import HTTPException

from app.models.deadline import Deadline
from app.models.program import Program
from app.models.requirement import Requirement
from app.models.user import User
from app.ownership import get_owned_child_or_404


def _make_user_with_program(db_session, email):
    user = User(email=email, name=email)
    db_session.add(user)
    db_session.flush()
    program = Program(
        user_id=user.id,
        school="Stanford",
        department="CS",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(program)
    db_session.flush()
    return user, program


def test_get_owned_child_returns_owned_row(db_session):
    user, program = _make_user_with_program(db_session, "owner@example.com")
    req = Requirement(program_id=program.id, label="CV", kind="cv", status="todo")
    db_session.add(req)
    db_session.flush()

    found = get_owned_child_or_404(Requirement, req.id, user, db_session)
    assert found.id == req.id


def test_get_owned_child_404_for_other_users_row(db_session):
    owner, program = _make_user_with_program(db_session, "owner@example.com")
    req = Requirement(program_id=program.id, label="CV", kind="cv", status="todo")
    db_session.add(req)
    db_session.flush()

    other = User(email="other@example.com", name="Other")
    db_session.add(other)
    db_session.flush()

    with pytest.raises(HTTPException) as exc:
        get_owned_child_or_404(Requirement, req.id, other, db_session)
    assert exc.value.status_code == 404


def test_get_owned_child_404_detail_uses_model_name(db_session):
    user, _ = _make_user_with_program(db_session, "owner@example.com")

    with pytest.raises(HTTPException) as exc:
        get_owned_child_or_404(Deadline, 99999, user, db_session)
    assert exc.value.detail == "Deadline not found"
