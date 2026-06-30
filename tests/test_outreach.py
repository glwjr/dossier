import pytest

from app.models.outreach import OutreachContact
from app.models.program import Program
from app.models.user import User

PROGRAM_PAYLOAD = {
    "school": "Stanford",
    "department": "Neurosciences",
    "degree": "PhD",
    "tier": "reach",
    "status": "researching",
}

CONTACT_PAYLOAD = {
    "name": "Prof. Robert Malenka",
    "email": "malenka@stanford.edu",
    "url": "https://malenkalab.stanford.edu",
}


@pytest.fixture()
def program(client, dev_user):
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def contact(client, program):
    response = client.post(f"/programs/{program['id']}/outreach", json=CONTACT_PAYLOAD)
    assert response.status_code == 201
    return response.json()


def test_create_contact(client, program):
    response = client.post(f"/programs/{program['id']}/outreach", json=CONTACT_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Prof. Robert Malenka"
    assert data["email"] == "malenka@stanford.edu"
    assert data["url"] == "https://malenkalab.stanford.edu"
    assert data["response"] == "none"
    assert data["contacted_on"] is None
    assert data["program_id"] == program["id"]


def test_create_contact_with_date_and_response(client, program):
    response = client.post(
        f"/programs/{program['id']}/outreach",
        json={**CONTACT_PAYLOAD, "contacted_on": "2026-01-15", "response": "positive"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["contacted_on"] == "2026-01-15"
    assert data["response"] == "positive"


def test_create_contact_with_research_area(client, program):
    response = client.post(
        f"/programs/{program['id']}/outreach",
        json={**CONTACT_PAYLOAD, "research_area": "Synaptic plasticity"},
    )
    assert response.status_code == 201
    assert response.json()["research_area"] == "Synaptic plasticity"


def test_create_contact_defaults_research_area_none(client, program):
    response = client.post(f"/programs/{program['id']}/outreach", json=CONTACT_PAYLOAD)
    assert response.status_code == 201
    assert response.json()["research_area"] is None


def test_list_contacts(client, program, contact):
    response = client.get(f"/programs/{program['id']}/outreach")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == contact["id"]


def test_update_contact(client, contact):
    response = client.patch(
        f"/outreach/{contact['id']}",
        json={"response": "meeting_scheduled", "notes": "Zoom call booked for Feb 3"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "meeting_scheduled"
    assert data["notes"] == "Zoom call booked for Feb 3"
    assert data["name"] == "Prof. Robert Malenka"  # unchanged


def test_delete_contact(client, contact):
    response = client.delete(f"/outreach/{contact['id']}")
    assert response.status_code == 204

    response = client.patch(f"/outreach/{contact['id']}", json={"response": "positive"})
    assert response.status_code == 404


def test_list_all_outreach(client, program, contact):
    # GET /outreach returns all contacts across programs with nested program info.
    r = client.get("/outreach")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["id"] == contact["id"]
    assert items[0]["program"]["school"] == "Stanford"
    assert items[0]["program"]["id"] == program["id"]


def test_list_all_outreach_isolation(client, db_session):
    # Contacts from other users' programs must not appear.
    user_b = User(email="user-b-outreach-all@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()
    prog_b = Program(
        user_id=user_b.id,
        school="Caltech",
        department="Biology",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(prog_b)
    db_session.flush()
    db_session.add(
        OutreachContact(program_id=prog_b.id, name="Prof. X", response="none")
    )
    db_session.flush()

    r = client.get("/outreach")
    assert r.status_code == 200
    assert r.json() == []


def test_create_contact_invalid_response(client, program):
    response = client.post(
        f"/programs/{program['id']}/outreach",
        json={**CONTACT_PAYLOAD, "response": "pending"},
    )
    assert response.status_code == 422


def test_list_on_nonexistent_program_returns_404(client, dev_user):
    response = client.get("/programs/99999/outreach")
    assert response.status_code == 404


def test_create_on_nonexistent_program_returns_404(client, dev_user):
    response = client.post("/programs/99999/outreach", json=CONTACT_PAYLOAD)
    assert response.status_code == 404


def test_outreach_isolation(client, db_session):
    """User A cannot access or mutate User B's outreach contacts."""
    user_b = User(email="user-b-outreach@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()

    program_b = Program(
        user_id=user_b.id,
        school="MIT",
        department="Brain and Cognitive Sciences",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(program_b)
    db_session.flush()

    contact_b = OutreachContact(
        program_id=program_b.id,
        name="Prof. Secret",
        response="none",
    )
    db_session.add(contact_b)
    db_session.flush()

    assert client.get(f"/programs/{program_b.id}/outreach").status_code == 404
    assert (
        client.post(
            f"/programs/{program_b.id}/outreach", json=CONTACT_PAYLOAD
        ).status_code
        == 404
    )
    assert (
        client.patch(
            f"/outreach/{contact_b.id}", json={"response": "positive"}
        ).status_code
        == 404
    )
    assert client.delete(f"/outreach/{contact_b.id}").status_code == 404
