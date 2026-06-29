def test_me_returns_current_user(client, dev_user):
    response = client.get("/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == dev_user.email
    assert data["name"] == dev_user.name
    assert "id" in data
    assert "created_at" in data


def test_export_isolation(client, db_session):
    """Export must only include the current user's data."""
    from app.models.program import Program
    from app.models.user import User

    user_b = User(email="user-b-export@example.com", name="User B")
    db_session.add(user_b)
    db_session.flush()
    db_session.add(
        Program(
            user_id=user_b.id,
            school="Harvard",
            department="Neuroscience",
            degree="PhD",
            tier="reach",
            status="researching",
        )
    )
    db_session.flush()

    data = client.get("/me/export").json()
    schools = [p["school"] for p in data["programs"]]
    assert "Harvard" not in schools


def test_export_structure(client, dev_user):
    r = client.get("/me/export")
    assert r.status_code == 200
    assert "attachment" in r.headers["content-disposition"]
    data = r.json()
    assert data["user"]["email"] == dev_user.email
    assert "exported_at" in data
    assert isinstance(data["programs"], list)
    assert isinstance(data["recommenders"], list)
