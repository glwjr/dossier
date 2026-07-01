from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import create_access_token
from app.config import settings
from app.demo import (
    clone_user_data,
    purge_expired_demo_users,
    purge_surplus_demo_users,
)
from app.models.advisor import Advisor, AdvisorResponse
from app.models.deadline import Deadline, DeadlineKind
from app.models.document import Document, DocumentKind, DocumentStatus
from app.models.program import Program, ProgramStatus, Tier
from app.models.recommender import (
    ProgramRecommender,
    Recommender,
    RecommenderStatus,
)
from app.models.requirement import Requirement, RequirementKind, RequirementStatus
from app.models.user import User


def _build_template(db: Session) -> User:
    """A template user with one program touching every child entity."""
    template = User(email="demo-template@example.com", name="Template")
    db.add(template)
    db.flush()

    rec = Recommender(
        user_id=template.id,
        name="Prof. Chen",
        email="chen@example.com",
        institution="UCSD",
        notes="primary",
    )
    db.add(rec)
    db.flush()

    prog = Program(
        user_id=template.id,
        school="MIT",
        department="EECS",
        degree="PhD",
        tier=Tier.reach,
        status=ProgramStatus.submitted,
        app_fee=90,
        notes="template program",
    )
    db.add(prog)
    db.flush()

    db.add(
        Requirement(
            program_id=prog.id,
            label="SOP",
            kind=RequirementKind.sop,
            status=RequirementStatus.done,
            due_date=date(2025, 12, 1),
        )
    )
    db.add(
        Deadline(
            program_id=prog.id,
            kind=DeadlineKind.application,
            due_date=date(2025, 12, 1),
            done=True,
        )
    )
    db.add(
        Advisor(
            program_id=prog.id,
            name="Prof. Barzilay",
            response=AdvisorResponse.positive,
        )
    )
    db.add(
        Document(
            program_id=prog.id,
            kind=DocumentKind.sop,
            title="SOP — MIT",
            status=DocumentStatus.final,
        )
    )
    db.add(
        ProgramRecommender(
            program_id=prog.id,
            recommender_id=rec.id,
            status=RecommenderStatus.submitted,
        )
    )
    db.flush()
    return template


def _programs_for(db: Session, user: User) -> list[Program]:
    return list(db.scalars(select(Program).where(Program.user_id == user.id)))


# --- clone_user_data ---


def test_clone_copies_full_graph(db_session):
    template = _build_template(db_session)
    dest = User(email="demo-abc@demo.local", name="Demo User", is_demo=True)
    db_session.add(dest)
    db_session.flush()

    clone_user_data(db_session, template, dest)

    progs = _programs_for(db_session, dest)
    assert len(progs) == 1
    pc = progs[0]
    assert pc.school == "MIT"
    assert pc.user_id == dest.id

    assert (
        db_session.scalar(
            select(Requirement).where(Requirement.program_id == pc.id)
        ).label
        == "SOP"
    )
    assert (
        db_session.scalar(select(Deadline).where(Deadline.program_id == pc.id)).kind
        == DeadlineKind.application
    )
    assert (
        db_session.scalar(select(Advisor).where(Advisor.program_id == pc.id)).name
        == "Prof. Barzilay"
    )
    assert (
        db_session.scalar(select(Document).where(Document.program_id == pc.id)).title
        == "SOP — MIT"
    )

    recs = list(
        db_session.scalars(select(Recommender).where(Recommender.user_id == dest.id))
    )
    assert len(recs) == 1
    assert recs[0].name == "Prof. Chen"

    pr = db_session.scalar(
        select(ProgramRecommender).where(ProgramRecommender.program_id == pc.id)
    )
    # Junction must point at the CLONED recommender, not the template's.
    assert pr.recommender_id == recs[0].id


def test_clone_is_independent_of_template(db_session):
    template = _build_template(db_session)
    dest = User(email="demo-abc@demo.local", name="Demo User", is_demo=True)
    db_session.add(dest)
    db_session.flush()

    clone_user_data(db_session, template, dest)

    pc = _programs_for(db_session, dest)[0]
    pc.school = "Edited"
    db_session.flush()

    template_prog = _programs_for(db_session, template)[0]
    assert template_prog.school == "MIT"


def test_clone_does_not_copy_calendar_token(db_session):
    template = _build_template(db_session)
    template.calendar_token = "secret-token"
    db_session.flush()

    dest = User(email="demo-abc@demo.local", name="Demo User", is_demo=True)
    db_session.add(dest)
    db_session.flush()

    clone_user_data(db_session, template, dest)
    assert dest.calendar_token is None


# --- purge_expired_demo_users ---


def test_purge_removes_expired_demo_users_and_data(db_session):
    template = _build_template(db_session)
    old = User(
        email="demo-old@demo.local",
        name="Old Demo",
        is_demo=True,
        created_at=datetime.now(timezone.utc) - timedelta(hours=48),
    )
    db_session.add(old)
    db_session.flush()
    clone_user_data(db_session, template, old)

    purge_expired_demo_users(db_session, ttl_hours=24)

    assert db_session.scalar(select(User).where(User.id == old.id)) is None
    assert _programs_for(db_session, old) == []


def test_purge_keeps_fresh_demo_users(db_session):
    template = _build_template(db_session)
    fresh = User(
        email="demo-fresh@demo.local",
        name="Fresh Demo",
        is_demo=True,
        created_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db_session.add(fresh)
    db_session.flush()
    clone_user_data(db_session, template, fresh)

    purge_expired_demo_users(db_session, ttl_hours=24)

    assert db_session.scalar(select(User).where(User.id == fresh.id)) is not None
    assert len(_programs_for(db_session, fresh)) == 1


def test_purge_ignores_non_demo_users(db_session):
    old_real = User(
        email="real@example.com",
        name="Real User",
        is_demo=False,
        created_at=datetime.now(timezone.utc) - timedelta(hours=999),
    )
    db_session.add(old_real)
    db_session.flush()

    purge_expired_demo_users(db_session, ttl_hours=24)

    assert db_session.scalar(select(User).where(User.id == old_real.id)) is not None


# --- purge_surplus_demo_users (abuse cap) ---


def _demo_user(db: Session, suffix: str, hours_old: float) -> User:
    u = User(
        email=f"demo-{suffix}@demo.local",
        name="Demo",
        is_demo=True,
        created_at=datetime.now(timezone.utc) - timedelta(hours=hours_old),
    )
    db.add(u)
    db.flush()
    return u


def test_surplus_evicts_oldest_demo_users(db_session):
    template = _build_template(db_session)
    users = [_demo_user(db_session, str(i), hours_old=i) for i in range(5)]
    for u in users:
        clone_user_data(db_session, template, u)

    purge_surplus_demo_users(db_session, max_users=2)

    remaining = list(db_session.scalars(select(User.id).where(User.is_demo)))
    # The two youngest (smallest hours_old) survive.
    assert set(remaining) == {users[0].id, users[1].id}
    # Evicted users' data is gone too.
    assert _programs_for(db_session, users[4]) == []


def test_surplus_is_noop_under_cap(db_session):
    _demo_user(db_session, "a", hours_old=1)
    purge_surplus_demo_users(db_session, max_users=10)
    assert db_session.scalar(select(func.count()).select_from(User)) == 1


# --- /auth/demo endpoint ---


def test_demo_endpoint_creates_isolated_account(raw_client, db_session, monkeypatch):
    template = _build_template(db_session)
    monkeypatch.setattr(settings, "demo_template_email", template.email)
    monkeypatch.setattr(settings, "frontend_url", "")

    response = raw_client.post("/auth/demo")
    assert response.status_code == 200
    token = response.json()["access_token"]

    # The minted token authenticates a brand-new demo user with cloned data.
    me = raw_client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.json()
    assert body["email"].startswith("demo-")
    assert body["email"] != template.email

    demo_user = db_session.scalar(select(User).where(User.email == body["email"]))
    assert demo_user.is_demo is True
    assert len(_programs_for(db_session, demo_user)) == 1


def test_demo_endpoint_redirects_to_frontend(raw_client, db_session, monkeypatch):
    template = _build_template(db_session)
    monkeypatch.setattr(settings, "demo_template_email", template.email)
    monkeypatch.setattr(settings, "frontend_url", "http://localhost:3000")

    response = raw_client.post("/auth/demo", follow_redirects=False)
    # 303 See Other so the browser issues a GET on the callback after our POST.
    assert response.status_code == 303
    assert response.headers["location"].startswith(
        "http://localhost:3000/auth/callback?token="
    )


def test_demo_endpoint_501_when_disabled(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "demo_template_email", "")
    response = raw_client.post("/auth/demo")
    assert response.status_code == 501


def test_each_demo_login_is_a_separate_account(raw_client, db_session, monkeypatch):
    template = _build_template(db_session)
    monkeypatch.setattr(settings, "demo_template_email", template.email)
    monkeypatch.setattr(settings, "frontend_url", "")

    first = raw_client.post("/auth/demo").json()["access_token"]
    second = raw_client.post("/auth/demo").json()["access_token"]

    email1 = raw_client.get("/me", headers={"Authorization": f"Bearer {first}"}).json()[
        "email"
    ]
    email2 = raw_client.get(
        "/me", headers={"Authorization": f"Bearer {second}"}
    ).json()["email"]
    assert email1 != email2


def test_demo_endpoint_enforces_cap(raw_client, db_session, monkeypatch):
    template = _build_template(db_session)
    monkeypatch.setattr(settings, "demo_template_email", template.email)
    monkeypatch.setattr(settings, "frontend_url", "")
    monkeypatch.setattr(settings, "demo_max_users", 2)

    for _ in range(4):
        assert raw_client.post("/auth/demo").status_code == 200

    live = db_session.scalar(select(func.count()).select_from(User).where(User.is_demo))
    assert live <= 2


def test_demo_endpoint_rate_limited(raw_client, db_session, monkeypatch):
    template = _build_template(db_session)
    monkeypatch.setattr(settings, "demo_template_email", template.email)
    monkeypatch.setattr(settings, "frontend_url", "")
    monkeypatch.setattr(settings, "demo_rate_limit_per_minute", 3)

    for _ in range(3):
        assert raw_client.post("/auth/demo").status_code == 200
    blocked = raw_client.post("/auth/demo")
    assert blocked.status_code == 429
    assert "retry-after" in {k.lower() for k in blocked.headers}


def test_demo_user_cannot_delete_account(raw_client, db_session):
    demo = _demo_user(db_session, "del", hours_old=0)
    token = create_access_token({"sub": demo.email})

    response = raw_client.delete("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert db_session.scalar(select(User).where(User.id == demo.id)) is not None


def test_demo_user_cannot_create_calendar_token(raw_client, db_session):
    demo = _demo_user(db_session, "cal", hours_old=0)
    token = create_access_token({"sub": demo.email})

    response = raw_client.post(
        "/me/calendar-token", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    db_session.refresh(demo)
    assert demo.calendar_token is None


def test_demo_user_cannot_revoke_calendar_token(raw_client, db_session):
    demo = _demo_user(db_session, "cal2", hours_old=0)
    token = create_access_token({"sub": demo.email})

    response = raw_client.delete(
        "/me/calendar-token", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
