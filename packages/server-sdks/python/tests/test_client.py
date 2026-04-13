import asyncio
import json

import httpx

from rtrq_server_sdk import RTRQServerSDK, RTRQServerSDKConfig
from rtrq_server_sdk.security import RTRQ_SHARED_SECRET_HEADER


def test_invalidate_sends_expected_request() -> None:
    captured, response = asyncio.run(
        _send_invalidation(topics=["todos", "users"], source="api"),
    )

    assert response.status_code == 200
    assert captured["url"] == "http://example.test/v1/invalidate"
    assert captured["has_secret_header"] is True
    assert captured["secret_header_matches_config"] is True
    assert captured["json"] == {"topics": ["todos", "users"], "source": "api"}


def test_invalidate_omits_source_when_not_provided() -> None:
    captured, response = asyncio.run(_send_invalidation(topics=["todos"]))

    assert response.status_code == 200
    assert captured["json"] == {"topics": ["todos"]}


async def _send_invalidation(
    *,
    topics: list[str],
    source: str | None = None,
) -> tuple[dict[str, object], httpx.Response]:
    captured: dict[str, object] = {}
    shared_secret = "test-shared-secret"
    config = RTRQServerSDKConfig(
        base_url="http://example.test",
        shared_secret=shared_secret,
    )

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["has_secret_header"] = RTRQ_SHARED_SECRET_HEADER in request.headers
        captured["secret_header_matches_config"] = (
            request.headers.get(RTRQ_SHARED_SECRET_HEADER)
            == config.shared_secret.get_secret_value()
        )
        captured["json"] = json.loads(request.read().decode())
        return httpx.Response(200, json={"ok": True})

    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport, base_url="http://example.test")
    sdk = RTRQServerSDK(config, client=client)

    try:
        response = await sdk.invalidate(topics, source=source)
    finally:
        await sdk.aclose()

    return captured, response
