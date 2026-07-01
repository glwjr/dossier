from sqlalchemy import select

from app.models.program import Program
from app.models.recommender import Recommender
from app.models.user import User

PROGRAM_PAYLOAD = {
    "school": "Stanford",
    "department": "Computer Science",
    "degree": "PhD",
    "tier": "reach",
    "status": "researching",
}


def test_delete_account_removes_user_and_all_data(client, dev_user, db_session):
    pid = client.post(
        "/programs?with_default_requirements=true", json=PROGRAM_PAYLOAD
    ).json()["id"]
    client.post(
        f"/programs/{pid}/deadlines",
        json={"kind": "application", "due_date": "2025-12-01"},
    )
    client.post(f"/programs/{pid}/advisors", json={"name": "Prof. X"})
    rec_id = client.post("/recommenders", json={"name": "Dr. Ref"}).json()["id"]
    client.post(f"/programs/{pid}/recommenders", json={"recommender_id": rec_id})

    response = client.delete("/me")
    assert response.status_code == 204

    assert db_session.get(User, dev_user.id) is None
    assert (
        db_session.scalars(select(Program).where(Program.user_id == dev_user.id)).all()
        == []
    )
    assert (
        db_session.scalars(
            select(Recommender).where(Recommender.user_id == dev_user.id)
        ).all()
        == []
    )


def test_delete_account_leaves_other_users_data(client, dev_user, db_session):
    other = User(email="other@example.com", name="Other")
    db_session.add(other)
    db_session.flush()
    other_prog = Program(
        user_id=other.id,
        school="MIT",
        department="EECS",
        degree="PhD",
        tier="reach",
        status="researching",
    )
    db_session.add(other_prog)
    db_session.commit()

    assert client.delete("/me").status_code == 204

    assert db_session.get(User, other.id) is not None
    assert db_session.get(Program, other_prog.id) is not None
