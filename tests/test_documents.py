import pytest

from app.models.document import Document
from app.models.program import Program
from app.models.user import User

PROGRAM_PAYLOAD = {
    "school": "NYU",
    "department": "Neuroscience",
    "degree": "PhD",
    "tier": "match",
    "status": "drafting",
}

DOC_PAYLOAD = {
    "kind": "sop",
    "title": "Statement of Purpose v1",
}


@pytest.fixture()
def program(client, dev_user):
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    return response.json()


@pytest.fixture()
def document(client, program):
    response = client.post(f"/programs/{program['id']}/documents", json=DOC_PAYLOAD)
    assert response.status_code == 201
    return response.json()


def test_create_document(client, program):
    response = client.post(f"/programs/{program['id']}/documents", json=DOC_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert data["kind"] == "sop"
    assert data["title"] == "Statement of Purpose v1"
    assert data["status"] == "draft"
    assert data["notes"] is None
    assert data["program_id"] == program["id"]
    assert "updated_at" in data


def test_create_document_with_status_and_notes(client, program):
    response = client.post(
        f"/programs/{program['id']}/documents",
        json={
            **DOC_PAYLOAD,
            "status": "in_progress",
            "notes": "Needs stronger opening",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "in_progress"
    assert data["notes"] == "Needs stronger opening"


def test_list_documents(client, program, document):
    response = client.get(f"/programs/{program['id']}/documents")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == document["id"]


def test_list_all_documents_includes_program(client, program, document):
    response = client.get("/documents")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == document["id"]
    assert items[0]["program"]["id"] == program["id"]
    assert items[0]["program"]["school"] == "NYU"


def test_update_document(client, document):
    response = client.patch(
        f"/documents/{document['id']}",
        json={"status": "final", "notes": "Ready to submit"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "final"
    assert data["notes"] == "Ready to submit"
    assert data["title"] == "Statement of Purpose v1"  # unchanged


def test_delete_document(client, document):
    response = client.delete(f"/documents/{document['id']}")
    assert response.status_code == 204

    response = client.patch(f"/documents/{document['id']}", json={"status": "final"})
    assert response.status_code == 404


def test_list_on_nonexistent_program_returns_404(client, dev_user):
    response = client.get("/programs/99999/documents")
    assert response.status_code == 404


def test_create_on_nonexistent_program_returns_404(client, dev_user):
    response = client.post("/programs/99999/documents", json=DOC_PAYLOAD)
    assert response.status_code == 404


def test_document_isolation(client, db_session):
    """User A cannot access or mutate User B's documents."""
    user_b = User(email="user-b-docs@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()

    program_b = Program(
        user_id=user_b.id,
        school="Yale",
        department="Neuroscience",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(program_b)
    db_session.flush()

    doc_b = Document(
        program_id=program_b.id,
        kind="sop",
        title="Secret SOP",
        status="draft",
    )
    db_session.add(doc_b)
    db_session.flush()

    assert client.get(f"/programs/{program_b.id}/documents").status_code == 404
    assert (
        client.post(f"/programs/{program_b.id}/documents", json=DOC_PAYLOAD).status_code
        == 404
    )
    assert (
        client.patch(f"/documents/{doc_b.id}", json={"status": "final"}).status_code
        == 404
    )
    assert client.delete(f"/documents/{doc_b.id}").status_code == 404
