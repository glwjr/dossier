from app.auth import DEV_USER_EMAIL
from app.models.user import User


def test_me_returns_seeded_user(client, db_session):
    # Seed the dev user inside the test transaction (rolled back afterwards)
    db_session.add(User(email=DEV_USER_EMAIL, name="Dev User"))
    db_session.flush()

    response = client.get("/me")

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == DEV_USER_EMAIL
    assert data["name"] == "Dev User"
    assert "id" in data
    assert "created_at" in data


def test_me_without_seeded_user_returns_401(client):
    response = client.get("/me")
    assert response.status_code == 401
