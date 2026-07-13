import asyncio
import json

import httpx
import pytest
from rtrq_server_sdk import (
    InvalidationResponse,
    RtrqClient,
    RtrqHttpError,
    RtrqResponseError,
    ServerSdkConfig,
    package_info,
)


def test_package_is_experimental() -> None:
    assert package_info.name == "rtrq-server-sdk"
    assert package_info.status == "experimental"


def test_config_shape_contains_server_secret_fields() -> None:
    config = ServerSdkConfig(
        app_id="app_test",
        api_key="rtrq_sk_test",
        server_url="http://localhost:8000",
    )

    assert config.app_id == "app_test"
    assert config.api_key.startswith("rtrq_sk_")
    assert config.server_url == "http://localhost:8000"


def test_config_normalizes_trailing_slash() -> None:
    config = ServerSdkConfig(
        app_id="app_test",
        api_key="rtrq_sk_test",
        server_url="http://localhost:8000/",
    )

    assert config.server_url == "http://localhost:8000"


def test_invalidate_posts_rest_invalidation() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"status": "ok", "delivered": 2})

    async def run() -> InvalidationResponse:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = RtrqClient(
                ServerSdkConfig(
                    app_id="app_test",
                    api_key="rtrq_sk_test",
                    server_url="https://rtrq.example.test",
                ),
                http_client=http_client,
            )

            return await client.invalidate(["todos", {"filter": "open"}])

    assert asyncio.run(run()) == InvalidationResponse(status="ok", delivered=2)
    assert len(requests) == 1

    request = requests[0]
    assert request.method == "POST"
    assert str(request.url) == "https://rtrq.example.test/v1/apps/app_test/invalidations"
    assert request.headers["X-RTRQ-API-Key"] == "rtrq_sk_test"
    assert json.loads(request.content) == {
        "key": ["todos", {"filter": "open"}],
        "matchMode": "prefix",
    }


def test_invalidate_accepts_exact_match_mode() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert json.loads(request.content)["matchMode"] == "exact"
        return httpx.Response(200, json={"status": "ok", "delivered": 0})

    async def run() -> InvalidationResponse:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = RtrqClient(
                ServerSdkConfig(
                    app_id="app_test",
                    api_key="rtrq_sk_test",
                    server_url="https://rtrq.example.test",
                ),
                http_client=http_client,
            )

            return await client.invalidate(["todos", 1], match_mode="exact")

    assert asyncio.run(run()).delivered == 0


def test_invalidate_raises_clear_error_for_bad_status() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": "invalid API key"})

    async def run() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = RtrqClient(
                ServerSdkConfig(
                    app_id="app_test",
                    api_key="rtrq_sk_test",
                    server_url="https://rtrq.example.test",
                ),
                http_client=http_client,
            )

            await client.invalidate(["todos"])

    with pytest.raises(RtrqHttpError, match="HTTP 401: invalid API key") as error:
        asyncio.run(run())
    assert error.value.status_code == 401


def test_invalidate_raises_for_unexpected_response_shape() -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"status": "ok"})

    async def run() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = RtrqClient(
                ServerSdkConfig(
                    app_id="app_test",
                    api_key="rtrq_sk_test",
                    server_url="https://rtrq.example.test",
                ),
                http_client=http_client,
            )

            await client.invalidate(["todos"])

    with pytest.raises(RtrqResponseError, match="integer delivered"):
        asyncio.run(run())


def test_invalidate_validates_key_and_match_mode_before_request() -> None:
    request_count = 0

    def handler(_request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(200, json={"status": "ok", "delivered": 0})

    async def run() -> None:
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
            client = RtrqClient(
                ServerSdkConfig(
                    app_id="app_test",
                    api_key="rtrq_sk_test",
                    server_url="https://rtrq.example.test",
                ),
                http_client=http_client,
            )

            with pytest.raises(ValueError, match="key must be a JSON array"):
                await client.invalidate("todos")  # type: ignore[arg-type]

            with pytest.raises(ValueError, match="finite number"):
                await client.invalidate(["todos", float("nan")])

            with pytest.raises(ValueError, match="match_mode must be one of"):
                await client.invalidate(["todos"], match_mode="contains")

    asyncio.run(run())
    assert request_count == 0
