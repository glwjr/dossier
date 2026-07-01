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


def test_docs_available_when_no_frontend_url(monkeypatch):
    from fastapi.testclient import TestClient

    from app.config import settings
    from app.main import create_app

    monkeypatch.setattr(settings, "frontend_url", "")
    dev = TestClient(create_app())
    assert dev.get("/docs").status_code == 200
    assert dev.get("/openapi.json").status_code == 200


def test_docs_disabled_in_prod(monkeypatch):
    from fastapi.testclient import TestClient

    from app.config import settings
    from app.main import create_app

    monkeypatch.setattr(settings, "frontend_url", "https://my.example.com")
    prod = TestClient(create_app())
    assert prod.get("/docs").status_code == 404
    assert prod.get("/redoc").status_code == 404
    assert prod.get("/openapi.json").status_code == 404
