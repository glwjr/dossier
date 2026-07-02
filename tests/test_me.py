def test_me_returns_current_user(client, dev_user):
    response = client.get("/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == dev_user.email
    assert data["name"] == dev_user.name
    assert "id" in data
    assert "created_at" in data
    # Regular users are flagged as non-demo so the UI can hide demo affordances.
    assert data["is_demo"] is False
    # Reminder emails are on by default.
    assert data["email_reminders"] is True


def test_patch_me_toggles_email_reminders(client, dev_user):
    off = client.patch("/me", json={"email_reminders": False})
    assert off.status_code == 200
    assert off.json()["email_reminders"] is False
    assert client.get("/me").json()["email_reminders"] is False

    on = client.patch("/me", json={"email_reminders": True})
    assert on.json()["email_reminders"] is True


def test_me_flags_demo_user(raw_client, db_session):
    from app.auth import AUTH_COOKIE, create_access_token
    from app.models.user import User

    demo = User(email="demo-me@demo.local", name="Demo User", is_demo=True)
    db_session.add(demo)
    db_session.flush()
    token = create_access_token({"sub": demo.email})

    data = raw_client.get("/me", cookies={AUTH_COOKIE: token}).json()
    assert data["is_demo"] is True


def test_logout_all_invalidates_existing_tokens(raw_client, db_session):
    from app.auth import AUTH_COOKIE, create_access_token
    from app.models.user import User

    user = User(email="logout-all@example.com", name="LA")
    db_session.add(user)
    db_session.flush()
    token = create_access_token({"sub": user.email, "ver": user.token_version})

    revoked = raw_client.post("/me/logout-all", cookies={AUTH_COOKIE: token})
    assert revoked.status_code == 204

    # The token used to make the request is now stale.
    stale = raw_client.get("/me", cookies={AUTH_COOKIE: token})
    assert stale.status_code == 401


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
