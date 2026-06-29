import pytest

from app.models.program import Program
from app.models.user import User

PROGRAM_PAYLOAD = {
    "school": "MIT",
    "department": "Brain and Cognitive Sciences",
    "degree": "PhD",
    "tier": "reach",
    "status": "researching",
}


@pytest.fixture()
def program(client, dev_user):
    """Create one program via the API and return the response JSON."""
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    return response.json()


def test_create_program(client, dev_user):
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert data["school"] == "MIT"
    assert data["tier"] == "reach"
    assert data["status"] == "researching"
    assert data["user_id"] == dev_user.id
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_program_rejects_negative_app_fee(client, dev_user):
    response = client.post("/programs", json={**PROGRAM_PAYLOAD, "app_fee": -5})
    assert response.status_code == 422


def test_list_programs(client, dev_user, program):
    response = client.get("/programs")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == program["id"]


def test_list_programs_pagination(client, dev_user):
    for i in range(3):
        client.post("/programs", json={**PROGRAM_PAYLOAD, "school": f"School {i}"})

    page = client.get("/programs", params={"limit": 2, "offset": 0})
    assert page.status_code == 200
    assert len(page.json()) == 2

    rest = client.get("/programs", params={"limit": 2, "offset": 2})
    assert len(rest.json()) == 1

    # No params → full collection (backward compatible)
    assert len(client.get("/programs").json()) == 3


def test_get_program(client, dev_user, program):
    response = client.get(f"/programs/{program['id']}")
    assert response.status_code == 200
    assert response.json()["school"] == "MIT"


def test_update_program(client, dev_user, program):
    response = client.patch(
        f"/programs/{program['id']}",
        json={"status": "submitted", "notes": "Submitted on time"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "submitted"
    assert data["notes"] == "Submitted on time"
    assert data["school"] == "MIT"  # unchanged


def test_delete_program(client, dev_user, program):
    response = client.delete(f"/programs/{program['id']}")
    assert response.status_code == 204

    response = client.get(f"/programs/{program['id']}")
    assert response.status_code == 404


def test_accepted_waitlisted_rejected_statuses(client, dev_user):
    for status in ("accepted", "waitlisted", "rejected"):
        r = client.post("/programs", json={**PROGRAM_PAYLOAD, "status": status})
        assert r.status_code == 201, f"expected 201 for status={status}"
        assert r.json()["status"] == status

    r = client.post("/programs", json={**PROGRAM_PAYLOAD, "status": "decision"})
    assert r.status_code == 422


def test_get_nonexistent_program_returns_404(client, dev_user):
    response = client.get("/programs/99999")
    assert response.status_code == 404


def test_user_isolation(client, dev_user, db_session):
    """User A (dev_user / current user) cannot read or mutate User B's programs."""
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

    # GET — 404, not 403, so existence isn't leaked
    assert client.get(f"/programs/{program_b.id}").status_code == 404

    # PATCH — 404
    assert (
        client.patch(f"/programs/{program_b.id}", json={"notes": "hacked"}).status_code
        == 404
    )

    # DELETE — 404
    assert client.delete(f"/programs/{program_b.id}").status_code == 404

    # GET /programs — user A's list must not include user B's program
    assert client.get("/programs").json() == []
