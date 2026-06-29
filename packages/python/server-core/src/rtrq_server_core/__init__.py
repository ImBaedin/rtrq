from dataclasses import dataclass

from rtrq_server_core.apps import AppStore, MemoryAppStore
from rtrq_server_core.core import RtrqCore
from rtrq_server_core.errors import (
    InvalidApiKeyError,
    InvalidOriginError,
    InvalidQueryKeyError,
    RtrqError,
    UnknownAppError,
)
from rtrq_server_core.models import AppConfig, InvalidationEvent, InvalidationRequest, MatchMode
from rtrq_server_core.registry import ClientSender, SubscriptionSession


@dataclass(frozen=True)
class PackageInfo:
    name: str
    runtime: str
    status: str


package_info = PackageInfo(
    name="rtrq-server-core",
    runtime="server",
    status="experimental",
)

__all__ = [
    "AppConfig",
    "AppStore",
    "ClientSender",
    "InvalidApiKeyError",
    "InvalidOriginError",
    "InvalidQueryKeyError",
    "InvalidationEvent",
    "InvalidationRequest",
    "MatchMode",
    "MemoryAppStore",
    "PackageInfo",
    "RtrqCore",
    "RtrqError",
    "SubscriptionSession",
    "UnknownAppError",
    "package_info",
]
