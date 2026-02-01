from fastapi.testclient import TestClient
from app.main import app
import os

client = TestClient(app)

def test_cors_configuration():
    # Test allowed origin
    allowed_origin = "http://localhost:3000"
    response = client.get("/", headers={"Origin": allowed_origin})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == allowed_origin

    # Test disallowed origin
    disallowed_origin = "http://evil.com"
    response = client.get("/", headers={"Origin": disallowed_origin})
    assert response.status_code == 200
    # FastAPI/Starlette does not send Access-Control-Allow-Origin if origin is not allowed
    assert "access-control-allow-origin" not in response.headers
