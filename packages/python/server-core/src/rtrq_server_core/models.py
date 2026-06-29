from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from enum import StrEnum

from rtrq_server_core.keys import (
    CanonicalQueryKey,
    JsonValue,
    normalize_query_key,
    query_key_to_json,
)


class MatchMode(StrEnum):
    PREFIX = "prefix"
    EXACT = "exact"


@dataclass(frozen=True)
class AppConfig:
    app_id: str
    api_key: str
    allowed_origins: tuple[str, ...] = ()

    def __init__(
        self,
        app_id: str,
        api_key: str,
        allowed_origins: Sequence[str] = (),
    ) -> None:
        object.__setattr__(self, "app_id", app_id)
        object.__setattr__(self, "api_key", api_key)
        object.__setattr__(self, "allowed_origins", tuple(allowed_origins))

    def allows_origin(self, origin: str | None) -> bool:
        return not self.allowed_origins or origin in self.allowed_origins


@dataclass(frozen=True)
class InvalidationRequest:
    key: CanonicalQueryKey
    match_mode: MatchMode = MatchMode.PREFIX

    def __init__(
        self,
        key: Sequence[JsonValue],
        match_mode: MatchMode | str = MatchMode.PREFIX,
    ) -> None:
        object.__setattr__(self, "key", normalize_query_key(key))
        object.__setattr__(self, "match_mode", MatchMode(match_mode))

    @property
    def exact(self) -> bool:
        return self.match_mode is MatchMode.EXACT


@dataclass(frozen=True)
class InvalidationEvent:
    app_id: str
    key: CanonicalQueryKey
    match_mode: MatchMode = MatchMode.PREFIX

    def to_payload(self) -> dict[str, JsonValue]:
        return {
            "type": "invalidation",
            "appId": self.app_id,
            "key": query_key_to_json(self.key),
            "matchMode": self.match_mode.value,
        }


@dataclass(frozen=True)
class ClientMetadata:
    values: Mapping[str, JsonValue] = field(default_factory=dict)
