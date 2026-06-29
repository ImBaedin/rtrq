import pytest
from fastapi.testclient import TestClient
from rtrq_server.main import app
from starlette.websockets import WebSocketDisconnect


def test_health_endpoint() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_rest_invalidation_requires_api_key() -> None:
    response = TestClient(app).post(
        "/v1/apps/dev/invalidations",
        json={"key": ["todos"]},
    )

    assert response.status_code == 401


def test_websocket_subscription_receives_matching_invalidation() -> None:
    with TestClient(app) as client:
        with client.websocket_connect("/v1/apps/dev/ws") as websocket:
            assert websocket.receive_json()["type"] == "connected"

            websocket.send_json({"type": "subscribe", "key": ["todos", "list"]})
            assert websocket.receive_json() == {
                "type": "subscribed",
                "key": ["todos", "list"],
            }

            response = client.post(
                "/v1/apps/dev/invalidations",
                headers={"x-rtrq-api-key": "dev-secret"},
                json={"key": ["todos"]},
            )

            assert response.status_code == 200
            assert response.json() == {"status": "ok", "delivered": 1}
            assert websocket.receive_json() == {
                "type": "invalidation",
                "appId": "dev",
                "key": ["todos"],
                "matchMode": "prefix",
            }


def test_websocket_rejects_non_object_message_and_disconnects_session() -> None:
    with TestClient(app) as client:
        with client.websocket_connect("/v1/apps/dev/ws") as websocket:
            assert websocket.receive_json()["type"] == "connected"

            websocket.send_json(["not", "an", "object"])
            with pytest.raises(WebSocketDisconnect) as error:
                websocket.receive_json()

            assert error.value.code == 1003

        assert client.get("/health").json()["connections"] == 0
