import pytest

from app.models.deadline import Deadline
from app.models.program import Program
from app.models.user import User

PROGRAM_PAYLOAD = {
    "school": "NYU",
    "department": "Neuroscience",
    "degree": "PhD",
    "tier": "match",
    "status": "researching",
}

DEADLINE_PAYLOAD = {
    "kind": "application",
    "due_date": "2025-12-15",
}


@pytest.fixture()
def program(client, dev_user):
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def deadline(client, program):
    response = client.post(
        f"/programs/{program['id']}/deadlines", json=DEADLINE_PAYLOAD
    )
    assert response.status_code == 201
    return response.json()


def test_create_deadline(client, program):
    response = client.post(
        f"/programs/{program['id']}/deadlines", json=DEADLINE_PAYLOAD
    )
    assert response.status_code == 201
    data = response.json()
    assert data["kind"] == "application"
    assert data["due_date"] == "2025-12-15"
    assert data["done"] is False
    assert data["program_id"] == program["id"]


def test_list_deadlines(client, program, deadline):
    response = client.get(f"/programs/{program['id']}/deadlines")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == deadline["id"]


def test_update_deadline(client, deadline):
    response = client.patch(
        f"/deadlines/{deadline['id']}",
        json={"done": True, "notes": "Submitted!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["done"] is True
    assert data["notes"] == "Submitted!"
    assert data["kind"] == "application"  # unchanged


def test_delete_deadline(client, deadline):
    response = client.delete(f"/deadlines/{deadline['id']}")
    assert response.status_code == 204

    response = client.patch(f"/deadlines/{deadline['id']}", json={"done": True})
    assert response.status_code == 404


def test_create_deadline_invalid_kind(client, program):
    response = client.post(
        f"/programs/{program['id']}/deadlines",
        json={**DEADLINE_PAYLOAD, "kind": "phone_screen"},
    )
    assert response.status_code == 422


def test_create_deadline_interview_kind(client, program):
    response = client.post(
        f"/programs/{program['id']}/deadlines",
        json={**DEADLINE_PAYLOAD, "kind": "interview"},
    )
    assert response.status_code == 201
    assert response.json()["kind"] == "interview"


def test_create_deadline_invalid_date_format(client, program):
    response = client.post(
        f"/programs/{program['id']}/deadlines",
        json={**DEADLINE_PAYLOAD, "due_date": "December 15, 2025"},
    )
    assert response.status_code == 422


def test_list_on_nonexistent_program_returns_404(client, dev_user):
    assert client.get("/programs/99999/deadlines").status_code == 404


def test_create_on_nonexistent_program_returns_404(client, dev_user):
    assert (
        client.post("/programs/99999/deadlines", json=DEADLINE_PAYLOAD).status_code
        == 404
    )


def test_deadline_isolation(client, dev_user, db_session):
    """User A cannot access or mutate User B's deadlines."""
    user_b = User(email="user-b@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()

    program_b = Program(
        user_id=user_b.id,
        school="UCSF",
        department="Neuroscience",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(program_b)
    db_session.flush()

    from datetime import date

    deadline_b = Deadline(
        program_id=program_b.id,
        kind="application",
        due_date=date(2025, 12, 1),
        done=False,
    )
    db_session.add(deadline_b)
    db_session.flush()

    # Nested list: program not found for user A → 404
    assert client.get(f"/programs/{program_b.id}/deadlines").status_code == 404

    # Nested create: program not found for user A → 404
    assert (
        client.post(
            f"/programs/{program_b.id}/deadlines", json=DEADLINE_PAYLOAD
        ).status_code
        == 404
    )

    # PATCH on user B's deadline → 404
    assert (
        client.patch(f"/deadlines/{deadline_b.id}", json={"done": True}).status_code
        == 404
    )

    # DELETE on user B's deadline → 404
    assert client.delete(f"/deadlines/{deadline_b.id}").status_code == 404


def test_list_all_deadlines(client, program, deadline):
    """GET /deadlines returns deadlines with program info, sorted by due_date."""
    # Create a second program and deadline with an earlier due date
    program2 = client.post(
        "/programs",
        json={
            "school": "MIT",
            "department": "Brain & Cognitive Sciences",
            "degree": "PhD",
            "tier": "reach",
            "status": "researching",
        },
    ).json()
    client.post(
        f"/programs/{program2['id']}/deadlines",
        json={"kind": "fellowship", "due_date": "2025-11-01"},
    )

    response = client.get("/deadlines")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    # Sorted ascending by due_date
    assert items[0]["due_date"] == "2025-11-01"
    assert items[1]["due_date"] == "2025-12-15"
    # Each item includes program info
    assert items[0]["program"]["school"] == "MIT"
    assert items[1]["program"]["school"] == "NYU"
