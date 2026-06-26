from datetime import date, timedelta

import pytest

PROGRAM_PAYLOAD = {
    "school": "Columbia",
    "department": "Neurobiology and Behavior",
    "degree": "PhD",
    "tier": "match",
    "status": "researching",
}

# A safely distant future date so days_remaining is always positive
FUTURE_DATE = "2099-01-01"
FUTURE_DAYS = (date(2099, 1, 1) - date.today()).days


@pytest.fixture()
def program(client, dev_user):
    response = client.post("/programs", json=PROGRAM_PAYLOAD)
    assert response.status_code == 201
    return response.json()


def _add_req(client, program_id, kind="sop", req_status="todo"):
    return client.post(
        f"/programs/{program_id}/requirements",
        json={"label": kind.upper(), "kind": kind, "status": req_status},
    ).json()


def _add_deadline(client, program_id, due_date=FUTURE_DATE, done=False):
    return client.post(
        f"/programs/{program_id}/deadlines",
        json={"kind": "application", "due_date": due_date, "done": done},
    ).json()


def test_dashboard_empty(client, dev_user):
    response = client.get("/dashboard")
    assert response.status_code == 200
    assert response.json() == []


def test_dashboard_no_requirements_no_deadlines(client, program):
    response = client.get("/dashboard")
    assert response.status_code == 200
    entries = response.json()
    assert len(entries) == 1
    entry = entries[0]
    assert entry["completion_pct"] == 0.0
    assert entry["next_deadline"] is None
    assert entry["days_remaining"] is None
    assert entry["blocking_requirements"] == []


def test_dashboard_completion_pct(client, program):
    pid = program["id"]
    _add_req(client, pid, kind="sop", req_status="done")
    _add_req(client, pid, kind="cv", req_status="todo")
    _add_req(client, pid, kind="transcript", req_status="in_progress")

    entries = client.get("/dashboard").json()
    entry = entries[0]
    # 1 done out of 3 total = 33.3%
    assert entry["completion_pct"] == 33.3


def test_dashboard_all_done(client, program):
    pid = program["id"]
    _add_req(client, pid, kind="sop", req_status="done")
    _add_req(client, pid, kind="cv", req_status="done")

    entry = client.get("/dashboard").json()[0]
    assert entry["completion_pct"] == 100.0
    assert entry["blocking_requirements"] == []


def test_dashboard_waived_not_blocking(client, program):
    pid = program["id"]
    _add_req(client, pid, kind="gre", req_status="waived")
    _add_req(client, pid, kind="sop", req_status="done")

    entry = client.get("/dashboard").json()[0]
    # waived does not count as done: 1/2 = 50%
    assert entry["completion_pct"] == 50.0
    # waived is not blocking
    assert entry["blocking_requirements"] == []


def test_dashboard_next_deadline(client, program):
    pid = program["id"]
    sooner = str(date.today() + timedelta(days=10))
    further = str(date.today() + timedelta(days=60))
    _add_deadline(client, pid, due_date=further)
    _add_deadline(client, pid, due_date=sooner)

    entry = client.get("/dashboard").json()[0]
    assert entry["next_deadline"] == sooner
    assert entry["days_remaining"] == 10


def test_dashboard_done_deadline_excluded(client, program):
    pid = program["id"]
    _add_deadline(client, pid, due_date=FUTURE_DATE, done=True)

    entry = client.get("/dashboard").json()[0]
    assert entry["next_deadline"] is None
    assert entry["days_remaining"] is None


def test_dashboard_blocking_requirements(client, program):
    pid = program["id"]
    _add_req(client, pid, kind="sop", req_status="todo")
    _add_req(client, pid, kind="cv", req_status="in_progress")
    _add_req(client, pid, kind="transcript", req_status="done")
    _add_req(client, pid, kind="gre", req_status="waived")

    entry = client.get("/dashboard").json()[0]
    blocking_kinds = {r["kind"] for r in entry["blocking_requirements"]}
    assert blocking_kinds == {"sop", "cv"}


def test_dashboard_multiple_programs(client, dev_user):
    p1 = client.post("/programs", json={**PROGRAM_PAYLOAD, "school": "MIT"}).json()
    p2 = client.post("/programs", json={**PROGRAM_PAYLOAD, "school": "NYU"}).json()

    _add_req(client, p1["id"], kind="sop", req_status="done")
    _add_req(client, p2["id"], kind="cv", req_status="todo")

    entries = client.get("/dashboard").json()
    assert len(entries) == 2
    by_school = {e["program"]["school"]: e for e in entries}
    assert by_school["MIT"]["completion_pct"] == 100.0
    assert by_school["NYU"]["completion_pct"] == 0.0
