from app.auth import AUTH_COOKIE, create_access_token
from app.models.program import Program, ProgramStatus, Tier
from app.models.user import User


def _program(db, user, school):
    p = Program(
        user_id=user.id,
        school=school,
        department="EECS",
        degree="PhD",
        tier=Tier.reach,
        status=ProgramStatus.submitted,
    )
    db.add(p)
    db.flush()
    return p


def test_rotate_and_revoke_share_token(client, dev_user, db_session):
    created = client.post("/me/share-token")
    assert created.status_code == 200
    token = created.json()["share_token"]
    assert token

    revoked = client.delete("/me/share-token")
    assert revoked.json()["share_token"] is None


def test_shared_view_returns_programs(raw_client, db_session):
    owner = User(email="owner@example.com", name="Owner", share_token="shared-tok")
    db_session.add(owner)
    db_session.flush()
    _program(db_session, owner, "MIT")
    _program(db_session, owner, "Stanford")

    resp = raw_client.get("/share/shared-tok")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Owner"
    schools = [p["school"] for p in body["programs"]]
    assert schools == ["MIT", "Stanford"]
    # No private fields leak through the share schema.
    assert "notes" not in body["programs"][0]
    assert "app_fee" not in body["programs"][0]


def test_shared_view_bad_token_404(raw_client):
    assert raw_client.get("/share/nope").status_code == 404


def test_demo_user_cannot_create_share_token(raw_client, db_session):
    demo = User(email="demo-share@demo.local", name="Demo", is_demo=True)
    db_session.add(demo)
    db_session.flush()
    token = create_access_token({"sub": demo.email})
    resp = raw_client.post("/me/share-token", cookies={AUTH_COOKIE: token})
    assert resp.status_code == 403
