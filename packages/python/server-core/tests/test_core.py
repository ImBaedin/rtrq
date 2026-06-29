import asyncio

import pytest
from rtrq_server_core import (
    AppConfig,
    InvalidApiKeyError,
    InvalidationEvent,
    InvalidationRequest,
    InvalidOriginError,
    InvalidQueryKeyError,
    MatchMode,
    MemoryAppStore,
    RtrqCore,
)


class RecordingSender:
    def __init__(self) -> None:
        self.events: list[InvalidationEvent] = []

    async def send_event(self, event: InvalidationEvent) -> None:
        self.events.append(event)


def test_prefix_invalidation_delivers_to_more_specific_subscription() -> None:
    async def run() -> None:
        sender = RecordingSender()
        core = RtrqCore(
            apps=MemoryAppStore(
                [
                    AppConfig(
                        app_id="app_123",
                        api_key="secret",
                        allowed_origins=["http://localhost:3000"],
                    )
                ]
            )
        )

        session = await core.connect_client(
            app_id="app_123",
            origin="http://localhost:3000",
            sender=sender,
        )
        await session.subscribe(["todos", "list"])

        delivered = await core.invalidate(
            app_id="app_123",
            api_key="secret",
            request=InvalidationRequest(key=["todos"]),
        )

        assert delivered == 1
        assert [event.to_payload() for event in sender.events] == [
            {
                "type": "invalidation",
                "appId": "app_123",
                "key": ["todos"],
                "matchMode": "prefix",
            }
        ]

    asyncio.run(run())


def test_exact_invalidation_does_not_deliver_to_more_specific_subscription() -> None:
    async def run() -> None:
        sender = RecordingSender()
        core = RtrqCore.for_development(app_id="app_123", api_key="secret")
        session = await core.connect_client(app_id="app_123", origin=None, sender=sender)
        await session.subscribe(["todos", "list"])

        delivered = await core.invalidate(
            app_id="app_123",
            api_key="secret",
            request=InvalidationRequest(key=["todos"], match_mode=MatchMode.EXACT),
        )

        assert delivered == 0
        assert sender.events == []

    asyncio.run(run())


def test_boolean_and_number_keys_do_not_match_each_other() -> None:
    async def run() -> None:
        sender = RecordingSender()
        core = RtrqCore.for_development(app_id="app_123", api_key="secret")
        session = await core.connect_client(app_id="app_123", origin=None, sender=sender)
        await session.subscribe(["feature", True])

        delivered = await core.invalidate(
            app_id="app_123",
            api_key="secret",
            request=InvalidationRequest(key=["feature", 1]),
        )

        assert delivered == 0
        assert sender.events == []

    asyncio.run(run())


def test_invalid_api_key_raises_typed_error() -> None:
    async def run() -> None:
        core = RtrqCore.for_development(app_id="app_123", api_key="secret")

        with pytest.raises(InvalidApiKeyError):
            await core.invalidate(
                app_id="app_123",
                api_key="wrong",
                request=InvalidationRequest(key=["todos"]),
            )

    asyncio.run(run())


def test_origin_allowlist_raises_typed_error() -> None:
    async def run() -> None:
        core = RtrqCore.for_development(
            app_id="app_123",
            api_key="secret",
            allowed_origins=["http://localhost:3000"],
        )

        with pytest.raises(InvalidOriginError):
            await core.connect_client(
                app_id="app_123",
                origin="http://evil.example",
                sender=RecordingSender(),
            )

    asyncio.run(run())


def test_query_keys_must_be_json_array_compatible() -> None:
    with pytest.raises(InvalidQueryKeyError):
        InvalidationRequest(key="todos")  # type: ignore[arg-type]

    with pytest.raises(InvalidQueryKeyError):
        InvalidationRequest(key=[{"bad": object()}])  # type: ignore[list-item]
