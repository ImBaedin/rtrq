from collections.abc import Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from rtrq_fastapi_react_demo.main import app, get_rtrq_client, store


class FakeRtrqClient:
    def __init__(self) -> None:
        self.invalidations: list[tuple[list[str], str]] = []

    async def invalidate(self, key: list[str], *, match_mode: str) -> None:
        self.invalidations.append((key, match_mode))


class FailingRtrqClient:
    async def invalidate(self, key: list[str], *, match_mode: str) -> None:
        raise RuntimeError("RTRQ unavailable")


@pytest.fixture
def fake_rtrq_client() -> FakeRtrqClient:
    return FakeRtrqClient()


@pytest.fixture(autouse=True)
def reset_demo_state(fake_rtrq_client: FakeRtrqClient) -> Generator[None]:
    store.reset()
    app.dependency_overrides[get_rtrq_client] = lambda: fake_rtrq_client

    yield

    app.dependency_overrides.clear()
    store.reset()


@pytest.fixture
def client() -> Generator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_health_endpoint() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_local_dev_ports_are_allowed_by_cors(client: TestClient) -> None:
    response = client.options(
        "/todos",
        headers={
            "Origin": "http://localhost:5174",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5174"


def test_todo_lifecycle_invalidates_todos(
    client: TestClient,
    fake_rtrq_client: FakeRtrqClient,
) -> None:
    create_response = client.post("/todos", json={"text": "Wire up the demo"})

    assert create_response.status_code == 201
    assert create_response.json() == {
        "id": 1,
        "text": "Wire up the demo",
        "completed": False,
    }

    list_response = client.get("/todos")
    assert list_response.status_code == 200
    assert list_response.json() == [
        {
            "id": 1,
            "text": "Wire up the demo",
            "completed": False,
        }
    ]

    toggle_response = client.post("/todos/1/toggle")
    assert toggle_response.status_code == 200
    assert toggle_response.json()["completed"] is True

    complete_response = client.patch("/todos/1", json={"completed": False})
    assert complete_response.status_code == 200
    assert complete_response.json()["completed"] is False

    delete_response = client.delete("/todos/1")
    assert delete_response.status_code == 204
    assert client.get("/todos").json() == []

    assert fake_rtrq_client.invalidations == [
        (["todos"], "prefix"),
        (["todos"], "prefix"),
        (["todos"], "prefix"),
        (["todos"], "prefix"),
    ]


@pytest.mark.parametrize(
    ("method", "path", "json_body"),
    [
        ("patch", "/todos/999", {"completed": True}),
        ("post", "/todos/999/toggle", None),
        ("delete", "/todos/999", None),
    ],
)
def test_missing_todo_returns_404_without_invalidating(
    client: TestClient,
    fake_rtrq_client: FakeRtrqClient,
    method: str,
    path: str,
    json_body: dict[str, Any] | None,
) -> None:
    response = client.request(method, path, json=json_body)

    assert response.status_code == 404
    assert response.json()["detail"] == "todo not found"
    assert fake_rtrq_client.invalidations == []


def test_mutation_returns_502_when_invalidation_fails(client: TestClient) -> None:
    app.dependency_overrides[get_rtrq_client] = lambda: FailingRtrqClient()

    response = client.post("/todos", json={"text": "This should report the RTRQ failure"})

    assert response.status_code == 502
    assert response.json()["detail"] == "failed to invalidate todos query: RTRQ unavailable"
