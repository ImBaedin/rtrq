import pytest
from httpx import ASGITransport, AsyncClient

from rtrq_server.app import create_app


@pytest.mark.asyncio
async def test_invalidate_accepts_topics_and_source() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/invalidate",
            json={"topics": ["todos", "users"], "source": "api"},
        )

    assert response.status_code == 200
    assert response.json() == {
        "accepted": True,
        "detail": "Invalidation transport is not wired yet.",
    }


@pytest.mark.asyncio
async def test_invalidate_defaults_source_to_none() -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post("/v1/invalidate", json={"topics": ["todos"]})

    assert response.status_code == 200
    assert response.json() == {
        "accepted": True,
        "detail": "Invalidation transport is not wired yet.",
    }
