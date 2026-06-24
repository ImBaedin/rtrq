from fastapi.testclient import TestClient
from rtrq_fastapi_react_demo.main import app


def test_health_endpoint() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
