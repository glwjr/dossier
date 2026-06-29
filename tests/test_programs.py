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


def test_optional_fields_default_to_null(client, dev_user):
    data = client.post("/programs", json=PROGRAM_PAYLOAD).json()
    assert data["location"] is None
    assert data["stipend"] is None
    assert data["decision_deadline"] is None


def test_create_program_with_optional_fields(client, dev_user):
    response = client.post(
        "/programs",
        json={
            **PROGRAM_PAYLOAD,
            "location": "Seattle, WA",
            "stipend": 37000,
            "decision_deadline": "2026-04-15",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["location"] == "Seattle, WA"
    assert data["stipend"] == 37000
    assert data["decision_deadline"] == "2026-04-15"


def test_create_program_rejects_negative_stipend(client, dev_user):
    response = client.post("/programs", json={**PROGRAM_PAYLOAD, "stipend": -1})
    assert response.status_code == 422


def test_update_program_optional_fields(client, dev_user, program):
    response = client.patch(
        f"/programs/{program['id']}",
        json={
            "location": "Baltimore, MD",
            "stipend": 38000,
            "decision_deadline": "2026-04-01",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["location"] == "Baltimore, MD"
    assert data["stipend"] == 38000
    assert data["decision_deadline"] == "2026-04-01"

    # Clear all three back to null
    cleared = client.patch(
        f"/programs/{program['id']}",
        json={"location": None, "stipend": None, "decision_deadline": None},
    )
    assert cleared.status_code == 200
    data = cleared.json()
    assert data["location"] is None
    assert data["stipend"] is None
    assert data["decision_deadline"] is None


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


def test_create_program_invalid_tier(client, dev_user):
    response = client.post("/programs", json={**PROGRAM_PAYLOAD, "tier": "safety"})
    assert response.status_code == 422


def test_create_program_missing_required_fields(client, dev_user):
    assert client.post("/programs", json={}).status_code == 422
    assert (
        client.post(
            "/programs", json={k: v for k, v in PROGRAM_PAYLOAD.items() if k != "tier"}
        ).status_code
        == 422
    )


def test_delete_program_cascades_to_children(client, dev_user):
    """Deleting a program must cascade-delete all child rows."""
    prog = client.post("/programs", json=PROGRAM_PAYLOAD).json()
    pid = prog["id"]

    client.post(
        f"/programs/{pid}/requirements",
        json={"label": "SOP", "kind": "sop", "status": "todo"},
    )
    client.post(
        f"/programs/{pid}/deadlines",
        json={"kind": "application", "due_date": "2025-12-01"},
    )
    client.post(f"/programs/{pid}/outreach", json={"name": "Prof. X"})
    client.post(f"/programs/{pid}/documents", json={"kind": "sop", "title": "My SOP"})

    assert len(client.get("/requirements").json()) == 1
    assert len(client.get("/deadlines").json()) == 1
    assert len(client.get("/outreach").json()) == 1
    assert len(client.get("/documents").json()) == 1

    assert client.delete(f"/programs/{pid}").status_code == 204

    assert client.get("/requirements").json() == []
    assert client.get("/deadlines").json() == []
    assert client.get("/outreach").json() == []
    assert client.get("/documents").json() == []


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
