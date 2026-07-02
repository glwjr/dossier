from datetime import date, timedelta
from unittest.mock import patch

from app.config import settings
from app.models.deadline import Deadline, DeadlineKind
from app.models.program import Program, ProgramStatus, Tier
from app.models.user import User

SECRET = "cron-secret-abc"


def _user_with_due_deadline(db, email, *, is_demo=False, email_reminders=True):
    u = User(email=email, name="U", is_demo=is_demo, email_reminders=email_reminders)
    db.add(u)
    db.flush()
    p = Program(
        user_id=u.id,
        school="MIT",
        department="EECS",
        degree="PhD",
        tier=Tier.reach,
        status=ProgramStatus.submitted,
    )
    db.add(p)
    db.flush()
    db.add(
        Deadline(
            program_id=p.id,
            kind=DeadlineKind.application,
            due_date=date.today() + timedelta(days=3),
            done=False,
        )
    )
    db.flush()
    return u


def test_weekly_digest_forbidden_without_key(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "cron_secret", SECRET)
    assert raw_client.post("/tasks/weekly-digest").status_code == 403


def test_weekly_digest_forbidden_with_wrong_key(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "cron_secret", SECRET)
    r = raw_client.post("/tasks/weekly-digest", headers={"X-Cron-Key": "nope"})
    assert r.status_code == 403


def test_weekly_digest_disabled_when_secret_blank(raw_client, monkeypatch):
    monkeypatch.setattr(settings, "cron_secret", "")
    r = raw_client.post("/tasks/weekly-digest", headers={"X-Cron-Key": "anything"})
    assert r.status_code == 403


def test_weekly_digest_sends_to_opted_in_users_only(
    raw_client, db_session, monkeypatch
):
    monkeypatch.setattr(settings, "cron_secret", SECRET)
    _user_with_due_deadline(db_session, "yes@example.com")
    _user_with_due_deadline(db_session, "off@example.com", email_reminders=False)
    _user_with_due_deadline(db_session, "demo@demo.local", is_demo=True)

    with patch("app.routers.tasks.send_email", return_value=True) as send:
        r = raw_client.post("/tasks/weekly-digest", headers={"X-Cron-Key": SECRET})

    assert r.status_code == 200
    body = r.json()
    assert body["sent"] == 1
    # Only the opted-in, non-demo user with due items got mail.
    recipients = [call.args[0] for call in send.call_args_list]
    assert recipients == ["yes@example.com"]
