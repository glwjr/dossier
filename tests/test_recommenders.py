import pytest

from app.models.recommender import Recommender
from app.models.user import User

PROGRAM_PAYLOAD = {
    "school": "Columbia",
    "department": "Neurobiology and Behavior",
    "degree": "PhD",
    "tier": "match",
    "status": "researching",
}

REC_PAYLOAD = {
    "name": "Dr. Jane Smith",
    "email": "jsmith@columbia.edu",
    "institution": "Columbia University",
}


@pytest.fixture()
def program(client, dev_user):
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def recommender(client):
    response = client.post("/recommenders", json=REC_PAYLOAD)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def assignment(client, program, recommender):
    response = client.post(
        f"/programs/{program['id']}/recommenders",
        json={"recommender_id": recommender["id"]},
    )
    assert response.status_code == 201
    return response.json()


# --- Top-level recommender CRUD ---


def test_create_recommender(client):
    response = client.post("/recommenders", json=REC_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Dr. Jane Smith"
    assert data["email"] == "jsmith@columbia.edu"
    assert data["institution"] == "Columbia University"
    assert data["notes"] is None
    assert "id" in data


def test_list_recommenders(client, recommender):
    response = client.get("/recommenders")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == recommender["id"]


def test_list_recommenders_includes_assignment_program(client, assignment, program):
    response = client.get("/recommenders")
    assert response.status_code == 200
    items = response.json()
    assignments = items[0]["program_assignments"]
    assert len(assignments) == 1
    assert assignments[0]["program_id"] == program["id"]
    assert assignments[0]["program"]["school"] == "Columbia"


def test_get_recommender(client, recommender):
    response = client.get(f"/recommenders/{recommender['id']}")
    assert response.status_code == 200
    assert response.json()["name"] == "Dr. Jane Smith"


def test_update_recommender(client, recommender):
    response = client.patch(
        f"/recommenders/{recommender['id']}",
        json={"email": "new@columbia.edu", "notes": "Very responsive"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "new@columbia.edu"
    assert data["notes"] == "Very responsive"
    assert data["name"] == "Dr. Jane Smith"  # unchanged


def test_delete_recommender(client, recommender):
    response = client.delete(f"/recommenders/{recommender['id']}")
    assert response.status_code == 204

    response = client.get(f"/recommenders/{recommender['id']}")
    assert response.status_code == 404


def test_get_nonexistent_recommender_returns_404(client):
    response = client.get("/recommenders/99999")
    assert response.status_code == 404


# --- Program-recommender junction ---


def test_assign_recommender_to_program(client, program, recommender):
    response = client.post(
        f"/programs/{program['id']}/recommenders",
        json={"recommender_id": recommender["id"]},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["recommender_id"] == recommender["id"]
    assert data["program_id"] == program["id"]
    assert data["status"] == "asked"
    assert data["recommender"]["name"] == "Dr. Jane Smith"


def test_list_program_recommenders(client, assignment, program):
    response = client.get(f"/programs/{program['id']}/recommenders")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["recommender"]["name"] == "Dr. Jane Smith"


def test_update_program_recommender(client, assignment, program, recommender):
    response = client.patch(
        f"/programs/{program['id']}/recommenders/{recommender['id']}",
        json={"status": "confirmed", "due_date": "2025-12-15"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "confirmed"
    assert data["due_date"] == "2025-12-15"
    assert data["recommender"]["name"] == "Dr. Jane Smith"  # still nested


def test_unassign_recommender_from_program(client, assignment, program, recommender):
    response = client.delete(
        f"/programs/{program['id']}/recommenders/{recommender['id']}"
    )
    assert response.status_code == 204

    items = client.get(f"/programs/{program['id']}/recommenders").json()
    assert items == []


def test_assign_duplicate_returns_409(client, assignment, program, recommender):
    response = client.post(
        f"/programs/{program['id']}/recommenders",
        json={"recommender_id": recommender["id"]},
    )
    assert response.status_code == 409


def test_duplicate_assignment_violates_db_constraint(
    client, assignment, db_session, program, recommender
):
    # The DB itself must reject a duplicate (program_id, recommender_id) pair,
    # independent of the application-level 409 check.
    from sqlalchemy.exc import IntegrityError

    from app.models.recommender import ProgramRecommender

    # Use a SAVEPOINT so the failed insert rolls back without disturbing the
    # outer test transaction.
    with pytest.raises(IntegrityError):
        with db_session.begin_nested():
            db_session.add(
                ProgramRecommender(
                    program_id=program["id"], recommender_id=recommender["id"]
                )
            )


def test_assign_to_nonexistent_program_returns_404(client, recommender):
    response = client.post(
        "/programs/99999/recommenders",
        json={"recommender_id": recommender["id"]},
    )
    assert response.status_code == 404


def test_assign_nonexistent_recommender_returns_404(client, program):
    response = client.post(
        f"/programs/{program['id']}/recommenders",
        json={"recommender_id": 99999},
    )
    assert response.status_code == 404


def test_delete_program_cascades_assignments(client, assignment, program, recommender):
    # Deleting a program must remove its junction rows; GET /recommenders must not 500.
    r = client.delete(f"/programs/{program['id']}")
    assert r.status_code == 204

    r = client.get("/recommenders")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["program_assignments"] == []


# --- Isolation ---


def test_recommender_isolation(client, db_session):
    """User A cannot access or mutate User B's recommenders."""
    user_b = User(email="user-b-rec@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()

    rec_b = Recommender(
        user_id=user_b.id,
        name="Prof. Other",
        email="other@example.com",
    )
    db_session.add(rec_b)
    db_session.flush()

    assert client.get(f"/recommenders/{rec_b.id}").status_code == 404
    assert (
        client.patch(f"/recommenders/{rec_b.id}", json={"name": "Hacked"}).status_code
        == 404
    )
    assert client.delete(f"/recommenders/{rec_b.id}").status_code == 404
