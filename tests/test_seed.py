from app.models.app_meta import AppMeta
from seed import (
    DEMO_TEMPLATE_VERSION,
    _get_meta,
    _needs_reseed,
    _set_meta,
)

# --- app_meta helpers ---


def test_get_meta_missing_returns_none(db_session):
    assert _get_meta(db_session, "nope") is None


def test_set_meta_inserts_then_updates(db_session):
    _set_meta(db_session, "demo_template_version", "1")
    assert _get_meta(db_session, "demo_template_version") == "1"

    _set_meta(db_session, "demo_template_version", "2")
    assert _get_meta(db_session, "demo_template_version") == "2"
    # No duplicate rows on update.
    rows = list(db_session.scalars(AppMeta.__table__.select()))
    assert len(rows) == 1


# --- reseed decision ---


def test_needs_reseed_when_template_missing():
    assert _needs_reseed(user_exists=False, stored=None, current="3") is True


def test_needs_reseed_when_version_unset():
    assert _needs_reseed(user_exists=True, stored=None, current="3") is True


def test_needs_reseed_when_version_outdated():
    assert _needs_reseed(user_exists=True, stored="2", current="3") is True


def test_no_reseed_when_current():
    assert _needs_reseed(user_exists=True, stored="3", current="3") is False


def test_demo_template_version_is_stringifiable():
    # The stored value is a string; the constant must round-trip cleanly.
    assert str(DEMO_TEMPLATE_VERSION) == str(int(DEMO_TEMPLATE_VERSION))
