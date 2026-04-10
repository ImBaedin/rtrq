from fastapi.testclient import TestClient

from rtrq_server.app import create_app


def test_invalidate_accepts_keys_and_source() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/v1/invalidate",
        json={"keys": ["todos", "users"], "source": "api"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "accepted": True,
        "detail": "Invalidation transport is not wired yet.",
    }


def test_invalidate_defaults_source_to_none() -> None:
    client = TestClient(create_app())

    response = client.post("/v1/invalidate", json={"keys": ["todos"]})

    assert response.status_code == 200
    assert response.json() == {
        "accepted": True,
        "detail": "Invalidation transport is not wired yet.",
    }
