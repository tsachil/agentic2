from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Agentic Platform API"}

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_logs_ingest_cors_preflight_allows_dev_origin():
    response = client.options(
        "/logs/ingest",
        headers={
            "Origin": "http://localhost:5174",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code in (200, 204)
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5174"

def test_logs_ingest_accepts_payload():
    payload = {
        "level": "info",
        "message": "test",
        "context": {"correlationId": "abc"},
        "timestamp": "2026-02-03T00:00:00Z",
    }
    response = client.post("/logs/ingest", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "received"}
