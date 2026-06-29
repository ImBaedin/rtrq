from __future__ import annotations

import secrets
from collections.abc import Mapping, Sequence

from rtrq_server_core.apps import AppStore, MemoryAppStore
from rtrq_server_core.errors import InvalidApiKeyError, InvalidOriginError, UnknownAppError
from rtrq_server_core.keys import JsonValue
from rtrq_server_core.models import AppConfig, InvalidationEvent, InvalidationRequest
from rtrq_server_core.registry import ClientSender, SubscriptionRegistry, SubscriptionSession


class RtrqCore:
    def __init__(
        self,
        *,
        apps: AppStore,
        registry: SubscriptionRegistry | None = None,
    ) -> None:
        self._apps = apps
        self._registry = registry or SubscriptionRegistry()

    @classmethod
    def for_development(
        cls,
        *,
        app_id: str,
        api_key: str,
        allowed_origins: Sequence[str] = (),
    ) -> RtrqCore:
        return cls(
            apps=MemoryAppStore(
                [
                    AppConfig(
                        app_id=app_id,
                        api_key=api_key,
                        allowed_origins=allowed_origins,
                    )
                ]
            )
        )

    async def connect_client(
        self,
        *,
        app_id: str,
        origin: str | None,
        sender: ClientSender,
        metadata: Mapping[str, JsonValue] | None = None,
    ) -> SubscriptionSession:
        app = await self._get_app(app_id)
        if not app.allows_origin(origin):
            raise InvalidOriginError(f"origin is not allowed for app {app_id}")

        return await self._registry.connect(
            app_id=app_id,
            sender=sender,
            metadata=metadata,
        )

    async def invalidate(
        self,
        *,
        app_id: str,
        api_key: str,
        request: InvalidationRequest,
    ) -> int:
        app = await self._get_app(app_id)
        if not secrets.compare_digest(api_key, app.api_key):
            raise InvalidApiKeyError(f"invalid API key for app {app_id}")

        event = InvalidationEvent(
            app_id=app_id,
            key=request.key,
            match_mode=request.match_mode,
        )
        return await self._registry.publish(event)

    async def connection_count(self) -> int:
        return await self._registry.connection_count()

    async def _get_app(self, app_id: str) -> AppConfig:
        app = await self._apps.get_app(app_id)
        if app is None:
            raise UnknownAppError(f"unknown app {app_id}")
        return app
