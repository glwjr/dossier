def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_ok_when_db_reachable(client):
    response = client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


def test_root_does_not_redirect_to_docs(client):
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 200
    assert response.json()["service"] == "dossier-api"
