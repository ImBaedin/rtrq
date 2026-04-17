import json
from pathlib import Path
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from rtrq_server.app import create_app


def test_valid_topic_fixtures_are_canonical() -> None:
    fixtures = _load_fixture("topics.json")

    for example in fixtures["valid"]:
        assert _canonical_topic(example["logicalKey"]) == example["topic"]


def test_invalid_topic_fixtures_are_rejected() -> None:
    fixtures = _load_fixture("topics.json")

    for example in fixtures["invalid"]:
        json_text = example["jsonText"]
        assert _is_valid_topic_string(json_text) is False


def test_valid_websocket_message_fixtures_match_mvp_taxonomy() -> None:
    fixtures = _load_fixture("websocket-messages.json")

    for example in fixtures["valid"]:
        assert _is_valid_websocket_message(example["message"]) is True


def test_invalid_websocket_message_fixtures_are_rejected() -> None:
    fixtures = _load_fixture("websocket-messages.json")

    for example in fixtures["invalid"]:
        assert _is_valid_websocket_message(example["message"]) is False


@pytest.mark.asyncio
async def test_valid_http_invalidation_fixtures_match_server_contract() -> None:
    fixtures = _load_fixture("http-invalidation.json")
    responses_by_name = {
        response["name"]: response for response in fixtures["valid"]["responses"]
    }
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        for example in fixtures["valid"]["requests"]:
            response = await client.post(
                "/v1/invalidate",
                headers=example["headers"],
                json=example["body"],
            )

            expected = responses_by_name[example["expectedResponse"]]
            assert response.status_code == expected["status"]
            assert response.json() == expected["body"]


@pytest.mark.asyncio
async def test_invalid_http_invalidation_fixtures_are_rejected() -> None:
    fixtures = _load_fixture("http-invalidation.json")
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        for example in fixtures["invalid"]["requests"]:
            response = await client.post(
                "/v1/invalidate",
                headers=example["headers"],
                json=example["body"],
            )

            assert response.status_code == example["expectedStatus"]
            if example["expectedStatus"] == 422:
                payload = response.json()
                assert "detail" in payload
                assert payload["detail"]
                assert example["reason"]


def _load_fixture(name: str) -> dict[str, Any]:
    return json.loads((_fixture_dir() / name).read_text())


def _fixture_dir() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "fixtures" / "protocol"
        if candidate.is_dir():
            return candidate

    raise RuntimeError("Could not locate fixtures/protocol directory.")


def _canonical_topic(value: Any) -> str:
    if not isinstance(value, list):
        raise ValueError("Topic logical keys must be JSON arrays.")

    return json.dumps(_canonicalize_json(value), separators=(",", ":"))


def _canonicalize_json(value: Any) -> Any:
    if isinstance(value, list):
        return [_canonicalize_json(item) for item in value]

    if isinstance(value, dict):
        return {
            key: _canonicalize_json(value[key])
            for key in sorted(value.keys())
        }

    if value is None or isinstance(value, (str, bool, int, float)):
        return value

    raise ValueError("Unsupported JSON value.")


def _is_valid_topic_string(topic: str) -> bool:
    try:
        parsed = json.loads(topic)
    except json.JSONDecodeError:
        return False

    if not isinstance(parsed, list):
        return False

    return _canonical_topic(parsed) == topic


def _is_valid_websocket_message(message: Any) -> bool:
    if not isinstance(message, dict):
        return False

    message_type = message.get("type")
    if not isinstance(message_type, str):
        return False

    if message_type in {"subscribe", "unsubscribe"}:
        return _is_non_empty_string(message.get("op_id")) and _is_non_empty_topic_list(
            message.get("topics"),
        )

    if message_type == "ready":
        return _is_non_empty_string(message.get("connection_id"))

    if message_type == "subscription_ack":
        return (
            _is_non_empty_string(message.get("op_id"))
            and message.get("action") in {"subscribe", "unsubscribe"}
            and isinstance(message.get("topic_count"), int)
            and message["topic_count"] >= 0
            and message.get("result") == "applied"
        )

    if message_type == "invalidation":
        return _is_non_empty_string(message.get("delivery_id")) and _is_non_empty_topic_list(
            message.get("topics"),
        )

    if message_type == "error":
        op_id = message.get("op_id")
        return (
            (op_id is None or _is_non_empty_string(op_id))
            and _is_non_empty_string(message.get("code"))
            and _is_non_empty_string(message.get("detail"))
        )

    return False


def _is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and value != ""


def _is_non_empty_topic_list(value: Any) -> bool:
    return (
        isinstance(value, list)
        and value != []
        and all(_is_valid_topic_string(topic) for topic in value)
    )
