from __future__ import annotations

from collections.abc import Iterable
from typing import Protocol

from rtrq_server_core.models import AppConfig


class AppStore(Protocol):
    async def get_app(self, app_id: str) -> AppConfig | None: ...


class MemoryAppStore:
    def __init__(self, apps: Iterable[AppConfig] = ()) -> None:
        self._apps = {app.app_id: app for app in apps}

    async def get_app(self, app_id: str) -> AppConfig | None:
        return self._apps.get(app_id)

    def set_app(self, app: AppConfig) -> None:
        self._apps[app.app_id] = app
