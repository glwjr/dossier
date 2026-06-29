import pytest

from app.models.program import Program
from app.models.requirement import Requirement
from app.models.user import User

PROGRAM_PAYLOAD = {
    "school": "Columbia",
    "department": "Neurobiology and Behavior",
    "degree": "PhD",
    "tier": "match",
    "status": "researching",
}

REQ_PAYLOAD = {
    "label": "Statement of Purpose",
    "kind": "sop",
    "status": "todo",
}


@pytest.fixture()
def program(client, dev_user):
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def req(client, program):
    response = client.post(f"/programs/{program['id']}/requirements", json=REQ_PAYLOAD)
    assert response.status_code == 201
    return response.json()


def test_create_requirement(client, program):
    response = client.post(f"/programs/{program['id']}/requirements", json=REQ_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert data["label"] == "Statement of Purpose"
    assert data["kind"] == "sop"
    assert data["status"] == "todo"
    assert data["program_id"] == program["id"]
    assert data["due_date"] is None


def test_create_requirement_with_due_date(client, program):
    response = client.post(
        f"/programs/{program['id']}/requirements",
        json={**REQ_PAYLOAD, "due_date": "2025-12-01"},
    )
    assert response.status_code == 201
    assert response.json()["due_date"] == "2025-12-01"


def test_list_requirements(client, program, req):
    response = client.get(f"/programs/{program['id']}/requirements")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == req["id"]


def test_update_requirement(client, req):
    response = client.patch(
        f"/requirements/{req['id']}",
        json={"status": "done", "notes": "Submitted via portal"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "done"
    assert data["notes"] == "Submitted via portal"
    assert data["label"] == "Statement of Purpose"  # unchanged


def test_delete_requirement(client, req):
    response = client.delete(f"/requirements/{req['id']}")
    assert response.status_code == 204

    # Verify gone — PATCH returns 404
    response = client.patch(f"/requirements/{req['id']}", json={"status": "done"})
    assert response.status_code == 404


def test_list_all_requirements(client, program, req):
    # GET /requirements returns all requirements across programs with program info.
    r = client.get("/requirements")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["id"] == req["id"]
    assert items[0]["program"]["school"] == "Columbia"
    assert items[0]["program"]["id"] == program["id"]


def test_list_all_requirements_isolation(client, db_session, dev_user):
    # Requirements from other users' programs must not appear.
    user_b = User(email="user-b-req-all@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()
    prog_b = Program(
        user_id=user_b.id,
        school="MIT",
        department="CS",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(prog_b)
    db_session.flush()
    db_session.add(
        Requirement(program_id=prog_b.id, label="CV", kind="cv", status="todo")
    )
    db_session.flush()

    r = client.get("/requirements")
    assert r.status_code == 200
    assert r.json() == []


def test_create_requirement_invalid_kind(client, program):
    response = client.post(
        f"/programs/{program['id']}/requirements",
        json={**REQ_PAYLOAD, "kind": "essay"},
    )
    assert response.status_code == 422


def test_create_requirement_invalid_status(client, program):
    response = client.post(
        f"/programs/{program['id']}/requirements",
        json={**REQ_PAYLOAD, "status": "completed"},
    )
    assert response.status_code == 422


def test_list_on_nonexistent_program_returns_404(client, dev_user):
    response = client.get("/programs/99999/requirements")
    assert response.status_code == 404


def test_create_on_nonexistent_program_returns_404(client, dev_user):
    response = client.post("/programs/99999/requirements", json=REQ_PAYLOAD)
    assert response.status_code == 404


def test_requirement_isolation(client, dev_user, db_session):
    """User A cannot access or mutate User B's requirements."""
    user_b = User(email="user-b@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()

    program_b = Program(
        user_id=user_b.id,
        school="Stanford",
        department="Neurosciences",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(program_b)
    db_session.flush()

    req_b = Requirement(
        program_id=program_b.id,
        label="CV",
        kind="cv",
        status="todo",
    )
    db_session.add(req_b)
    db_session.flush()

    # Nested list route: program not found for user A → 404
    assert client.get(f"/programs/{program_b.id}/requirements").status_code == 404

    # Nested create route: program not found for user A → 404
    assert (
        client.post(
            f"/programs/{program_b.id}/requirements", json=REQ_PAYLOAD
        ).status_code
        == 404
    )

    # PATCH on user B's requirement → 404
    assert (
        client.patch(f"/requirements/{req_b.id}", json={"status": "done"}).status_code
        == 404
    )

    # DELETE on user B's requirement → 404
    assert client.delete(f"/requirements/{req_b.id}").status_code == 404
