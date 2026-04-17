import asyncio
import json
from pathlib import Path
from typing import Any

import httpx
from pydantic import SecretStr

from rtrq_server_sdk import RTRQServerSDK, RTRQServerSDKConfig


def test_sdk_matches_valid_http_request_fixtures() -> None:
    fixtures = _load_fixture("http-invalidation.json")

    for example in fixtures["valid"]["requests"]:
        captured, response = asyncio.run(_send_fixture_request(example))

        assert response.status_code == 200
        assert captured["url"] == "http://example.test/v1/invalidate"
        assert captured["json"] == example["body"]
        assert captured["headers_match_fixture"] is True


def test_sdk_uses_valid_topic_fixture_values() -> None:
    fixtures = _load_fixture("topics.json")
    valid_topics = [example["topic"] for example in fixtures["valid"]]

    captured, response = asyncio.run(_send_topics(valid_topics[:2]))

    assert response.status_code == 200
    assert captured["json"] == {"topics": valid_topics[:2]}


async def _send_fixture_request(
    example: dict[str, Any],
) -> tuple[dict[str, object], httpx.Response]:
    return await _send_topics(
        example["body"]["topics"],
        source=example["body"].get("source"),
        secret=example["headers"]["x-rtrq-secret"],
    )


async def _send_topics(
    topics: list[str],
    *,
    source: str | None = None,
    secret: str = "example-shared-secret",
) -> tuple[dict[str, object], httpx.Response]:
    captured: dict[str, object] = {}
    config = RTRQServerSDKConfig(
        base_url="http://example.test",
        shared_secret=SecretStr(secret),
    )

    async def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["json"] = json.loads(request.read().decode())
        captured["headers_match_fixture"] = (
            request.headers.get("x-rtrq-secret") == config.shared_secret.get_secret_value()
        )
        return httpx.Response(200, json={"accepted": True})

    transport = httpx.MockTransport(handler)
    client = httpx.AsyncClient(transport=transport, base_url="http://example.test")
    sdk = RTRQServerSDK(config, client=client)

    try:
        response = await sdk.invalidate(topics, source=source)
    finally:
        await sdk.aclose()

    return captured, response


def _load_fixture(name: str) -> dict[str, Any]:
    return json.loads((_fixture_dir() / name).read_text())


def _fixture_dir() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "fixtures" / "protocol"
        if candidate.is_dir():
            return candidate

    raise RuntimeError("Could not locate fixtures/protocol directory.")
