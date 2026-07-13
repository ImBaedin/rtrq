from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

import httpx

type JsonPrimitive = str | int | float | bool | None
type JsonValue = JsonPrimitive | list[JsonValue] | dict[str, JsonValue]

MATCH_MODES = frozenset({"prefix", "exact"})


@dataclass(frozen=True)
class ServerSdkConfig:
    app_id: str
    api_key: str
    server_url: str

    def __post_init__(self) -> None:
        if not self.app_id:
            raise ValueError("app_id is required")
        if not self.api_key:
            raise ValueError("api_key is required")
        if not self.server_url:
            raise ValueError("server_url is required")

        object.__setattr__(self, "server_url", self.server_url.rstrip("/"))


@dataclass(frozen=True)
class InvalidationResponse:
    status: str
    delivered: int


class RtrqSdkError(Exception):
    """Base error raised by the RTRQ server SDK."""


class RtrqHttpError(RtrqSdkError):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(f"RTRQ invalidation failed with HTTP {status_code}: {message}")
        self.status_code = status_code
        self.message = message


class RtrqResponseError(RtrqSdkError):
    pass


class RtrqClient:
    def __init__(
        self,
        config: ServerSdkConfig,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._config = config
        self._owns_http_client = http_client is None
        self._http_client = http_client or httpx.AsyncClient()

    async def __aenter__(self) -> RtrqClient:
        return self

    async def __aexit__(self, *_exc_info: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._owns_http_client:
            await self._http_client.aclose()

    async def invalidate(
        self,
        key: Sequence[JsonValue],
        match_mode: str = "prefix",
    ) -> InvalidationResponse:
        normalized_key = _normalize_query_key(key)
        normalized_match_mode = _normalize_match_mode(match_mode)

        response = await self._http_client.post(
            f"{self._config.server_url}/v1/apps/{self._config.app_id}/invalidations",
            headers={"X-RTRQ-API-Key": self._config.api_key},
            json={
                "key": normalized_key,
                "matchMode": normalized_match_mode,
            },
        )

        if response.is_error:
            raise RtrqHttpError(response.status_code, _response_error_message(response))

        return _parse_invalidation_response(response)


@dataclass(frozen=True)
class PackageInfo:
    name: str
    runtime: str
    status: str


package_info = PackageInfo(
    name="rtrq-server-sdk",
    runtime="server",
    status="experimental",
)

__all__ = [
    "InvalidationResponse",
    "PackageInfo",
    "RtrqClient",
    "RtrqHttpError",
    "RtrqResponseError",
    "RtrqSdkError",
    "ServerSdkConfig",
    "package_info",
]


def _normalize_match_mode(match_mode: str) -> str:
    if match_mode not in MATCH_MODES:
        allowed = ", ".join(sorted(MATCH_MODES))
        raise ValueError(f"match_mode must be one of: {allowed}")

    return match_mode


def _normalize_query_key(key: object) -> list[JsonValue]:
    if isinstance(key, str | bytes) or not isinstance(key, Sequence):
        raise ValueError("key must be a JSON array")

    return [_normalize_json_value(item, path=f"key[{index}]") for index, item in enumerate(key)]


def _normalize_json_value(value: object, *, path: str) -> JsonValue:
    if value is None:
        return value

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError(f"{path} must be a finite number")
        return value

    if isinstance(value, list | tuple):
        return [
            _normalize_json_value(item, path=f"{path}[{index}]") for index, item in enumerate(value)
        ]

    if isinstance(value, Mapping):
        normalized: dict[str, JsonValue] = {}
        for item_key, item_value in value.items():
            if not isinstance(item_key, str):
                raise ValueError(f"{path} object keys must be strings")
            normalized[item_key] = _normalize_json_value(item_value, path=f"{path}.{item_key}")
        return normalized

    raise ValueError(f"{path} must be JSON serializable")


def _parse_invalidation_response(response: httpx.Response) -> InvalidationResponse:
    try:
        body = response.json()
    except ValueError as error:
        raise RtrqResponseError("RTRQ invalidation response was not valid JSON") from error

    if not isinstance(body, dict):
        raise RtrqResponseError("RTRQ invalidation response must be a JSON object")

    status = body.get("status")
    delivered = body.get("delivered")

    if not isinstance(status, str):
        raise RtrqResponseError("RTRQ invalidation response missing string status")
    if isinstance(delivered, bool) or not isinstance(delivered, int):
        raise RtrqResponseError("RTRQ invalidation response missing integer delivered count")

    return InvalidationResponse(status=status, delivered=delivered)


def _response_error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
    except ValueError:
        return response.text

    if isinstance(body, dict):
        detail = body.get("detail")
        if isinstance(detail, str):
            return detail

    return response.text
