from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from rtrq_server_core.errors import InvalidQueryKeyError

type JsonPrimitive = str | int | float | bool | None
type JsonValue = JsonPrimitive | list[JsonValue] | dict[str, JsonValue]


@dataclass(frozen=True)
class CanonicalPrimitive:
    kind: str
    value: JsonPrimitive


@dataclass(frozen=True)
class CanonicalObject:
    items: tuple[tuple[str, CanonicalJson], ...]


type CanonicalJson = CanonicalPrimitive | tuple[CanonicalJson, ...] | CanonicalObject
type CanonicalQueryKey = tuple[CanonicalJson, ...]


def normalize_query_key(value: object) -> CanonicalQueryKey:
    if isinstance(value, str | bytes) or not isinstance(value, Sequence):
        raise InvalidQueryKeyError("query key must be a JSON array")

    return tuple(
        _normalize_json_value(item, path=f"key[{index}]")
        for index, item in enumerate(value)
    )


def query_key_to_json(key: CanonicalQueryKey) -> list[JsonValue]:
    return [_canonical_to_json(item) for item in key]


def query_key_matches(
    *,
    invalidated_key: CanonicalQueryKey,
    subscribed_key: CanonicalQueryKey,
    exact: bool,
) -> bool:
    if exact:
        return invalidated_key == subscribed_key

    return subscribed_key[: len(invalidated_key)] == invalidated_key


def _normalize_json_value(value: object, *, path: str) -> CanonicalJson:
    if value is None:
        return CanonicalPrimitive("null", value)

    if isinstance(value, bool):
        return CanonicalPrimitive("boolean", value)

    if isinstance(value, str):
        return CanonicalPrimitive("string", value)

    if isinstance(value, int):
        return CanonicalPrimitive("number", value)

    if isinstance(value, float):
        if not math.isfinite(value):
            raise InvalidQueryKeyError(f"{path} must be a finite number")
        return CanonicalPrimitive("number", value)

    if isinstance(value, list | tuple):
        return tuple(
            _normalize_json_value(item, path=f"{path}[{index}]")
            for index, item in enumerate(value)
        )

    if isinstance(value, Mapping):
        items: list[tuple[str, CanonicalJson]] = []
        for item_key, item_value in value.items():
            if not isinstance(item_key, str):
                raise InvalidQueryKeyError(f"{path} object keys must be strings")
            items.append((item_key, _normalize_json_value(item_value, path=f"{path}.{item_key}")))

        return CanonicalObject(tuple(sorted(items, key=lambda item: item[0])))

    raise InvalidQueryKeyError(f"{path} must be JSON serializable")


def _canonical_to_json(value: CanonicalJson) -> JsonValue:
    if isinstance(value, CanonicalPrimitive):
        return value.value

    if isinstance(value, CanonicalObject):
        return {key: _canonical_to_json(item_value) for key, item_value in value.items}

    if isinstance(value, tuple):
        return [_canonical_to_json(item) for item in value]

    return value
