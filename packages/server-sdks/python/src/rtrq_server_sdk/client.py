from typing import Any

import httpx
from pydantic import BaseModel, ConfigDict, Field, SecretStr

from .security import build_shared_secret_headers


class RTRQServerSDKConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")

    base_url: str
    shared_secret: SecretStr
    timeout: float = Field(default=5.0, gt=0)
    api_prefix: str = "/v1"


class RTRQServerSDK:
    def __init__(
        self,
        config: RTRQServerSDKConfig,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.config = config
        self._client = client or httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout,
        )

    async def invalidate(
        self,
        topics: list[str],
        *,
        source: str | None = None,
    ) -> httpx.Response:
        payload: dict[str, Any] = {"topics": topics}
        if source is not None:
            payload["source"] = source

        return await self._client.post(
            f"{self.config.api_prefix}/invalidate",
            json=payload,
            headers=build_shared_secret_headers(self.config.shared_secret),
        )

    async def aclose(self) -> None:
        await self._client.aclose()
