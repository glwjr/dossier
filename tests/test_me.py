def test_me_returns_current_user(client, dev_user):
    response = client.get("/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == dev_user.email
    assert data["name"] == dev_user.name
    assert "id" in data
    assert "created_at" in data
