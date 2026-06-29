from __future__ import annotations

import asyncio
from collections import defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Protocol
from uuid import uuid4

from rtrq_server_core.keys import (
    CanonicalQueryKey,
    JsonValue,
    normalize_query_key,
    query_key_matches,
)
from rtrq_server_core.models import InvalidationEvent, MatchMode


class ClientSender(Protocol):
    async def send_event(self, event: InvalidationEvent) -> None: ...


@dataclass
class _ConnectionState:
    connection_id: str
    app_id: str
    sender: ClientSender
    metadata: Mapping[str, JsonValue] = field(default_factory=dict)
    subscriptions: set[CanonicalQueryKey] = field(default_factory=set)


class SubscriptionRegistry:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._connections: dict[str, _ConnectionState] = {}
        self._subscriptions: dict[tuple[str, CanonicalQueryKey], set[str]] = defaultdict(set)

    async def connect(
        self,
        *,
        app_id: str,
        sender: ClientSender,
        metadata: Mapping[str, JsonValue] | None = None,
    ) -> SubscriptionSession:
        connection_id = uuid4().hex
        state = _ConnectionState(
            connection_id=connection_id,
            app_id=app_id,
            sender=sender,
            metadata=metadata or {},
        )

        async with self._lock:
            self._connections[connection_id] = state

        return SubscriptionSession(connection_id=connection_id, registry=self)

    async def subscribe(self, *, connection_id: str, key: Sequence[JsonValue]) -> CanonicalQueryKey:
        normalized = normalize_query_key(key)

        async with self._lock:
            state = self._connections[connection_id]
            state.subscriptions.add(normalized)
            self._subscriptions[(state.app_id, normalized)].add(connection_id)

        return normalized

    async def unsubscribe(
        self,
        *,
        connection_id: str,
        key: Sequence[JsonValue],
    ) -> CanonicalQueryKey:
        normalized = normalize_query_key(key)

        async with self._lock:
            state = self._connections[connection_id]
            state.subscriptions.discard(normalized)
            subscribers = self._subscriptions.get((state.app_id, normalized))
            if subscribers is not None:
                subscribers.discard(connection_id)
                if not subscribers:
                    del self._subscriptions[(state.app_id, normalized)]

        return normalized

    async def disconnect(self, connection_id: str) -> None:
        async with self._lock:
            state = self._connections.pop(connection_id, None)
            if state is None:
                return

            for key in state.subscriptions:
                subscribers = self._subscriptions.get((state.app_id, key))
                if subscribers is not None:
                    subscribers.discard(connection_id)
                    if not subscribers:
                        del self._subscriptions[(state.app_id, key)]

    async def publish(self, event: InvalidationEvent) -> int:
        exact = event.match_mode is MatchMode.EXACT

        async with self._lock:
            sender_by_connection_id: dict[str, ClientSender] = {}
            for (app_id, subscribed_key), connection_ids in self._subscriptions.items():
                if app_id != event.app_id:
                    continue
                if not query_key_matches(
                    invalidated_key=event.key,
                    subscribed_key=subscribed_key,
                    exact=exact,
                ):
                    continue

                for connection_id in connection_ids:
                    state = self._connections.get(connection_id)
                    if state is not None:
                        sender_by_connection_id[connection_id] = state.sender

        if not sender_by_connection_id:
            return 0

        results = await asyncio.gather(
            *(sender.send_event(event) for sender in sender_by_connection_id.values()),
            return_exceptions=True,
        )

        return sum(not isinstance(result, Exception) for result in results)

    async def connection_count(self) -> int:
        async with self._lock:
            return len(self._connections)


@dataclass(frozen=True)
class SubscriptionSession:
    connection_id: str
    registry: SubscriptionRegistry

    async def subscribe(self, key: Sequence[JsonValue]) -> CanonicalQueryKey:
        return await self.registry.subscribe(connection_id=self.connection_id, key=key)

    async def unsubscribe(self, key: Sequence[JsonValue]) -> CanonicalQueryKey:
        return await self.registry.unsubscribe(connection_id=self.connection_id, key=key)

    async def close(self) -> None:
        await self.registry.disconnect(self.connection_id)
