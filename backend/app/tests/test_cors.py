from fastapi.testclient import TestClient
from app.main import app

def test_cors_allowed_origin():
    client = TestClient(app)
    # localhost:3000 is in the default allowed list
    response = client.get("/", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

def test_cors_disallowed_origin():
    client = TestClient(app)
    # evil.com is NOT in the default allowed list
    response = client.get("/", headers={"Origin": "http://evil.com"})
    assert response.status_code == 200
    # Should NOT have the header, or it should be null/different (FastAPI usually omits it)
    assert "access-control-allow-origin" not in response.headers
