PROGRAM_PAYLOAD = {
    "school": "Stanford",
    "department": "Computer Science",
    "degree": "PhD",
    "tier": "reach",
    "status": "researching",
}


def test_generate_calendar_token(client, dev_user):
    response = client.post("/me/calendar-token")
    assert response.status_code == 200
    token = response.json()["calendar_token"]
    assert token
    # /me now exposes the token.
    assert client.get("/me").json()["calendar_token"] == token


def test_rotate_calendar_token_changes_it(client, dev_user):
    first = client.post("/me/calendar-token").json()["calendar_token"]
    second = client.post("/me/calendar-token").json()["calendar_token"]
    assert first != second


def test_calendar_feed_contains_events(client, dev_user):
    pid = client.post("/programs", json=PROGRAM_PAYLOAD).json()["id"]
    client.post(
        f"/programs/{pid}/deadlines",
        json={"kind": "application", "due_date": "2025-12-01"},
    )
    client.post(
        f"/programs/{pid}/requirements",
        json={
            "label": "SOP",
            "kind": "sop",
            "status": "todo",
            "due_date": "2025-11-15",
        },
    )
    token = client.post("/me/calendar-token").json()["calendar_token"]

    response = client.get(f"/calendar/{token}.ics")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/calendar")
    body = response.text
    assert "BEGIN:VCALENDAR" in body
    assert body.count("BEGIN:VEVENT") == 2
    assert "Stanford: application deadline" in body
    assert "Stanford: SOP" in body
    assert "DTSTART;VALUE=DATE:20251201" in body


def test_calendar_feed_bad_token_returns_404(client):
    assert client.get("/calendar/not-a-real-token.ics").status_code == 404


def test_revoke_calendar_token_disables_feed(client, dev_user):
    token = client.post("/me/calendar-token").json()["calendar_token"]
    assert client.get(f"/calendar/{token}.ics").status_code == 200

    revoke = client.delete("/me/calendar-token")
    assert revoke.status_code == 200
    assert revoke.json()["calendar_token"] is None
    assert client.get(f"/calendar/{token}.ics").status_code == 404
