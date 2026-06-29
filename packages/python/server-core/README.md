# rtrq-server-core

Python server core primitives for RTRQ.

Current responsibilities include app authentication primitives, JSON-compatible query key normalization,
prefix/exact key matching, WebSocket subscription state, and protocol objects shared by the FastAPI server.
The core intentionally does not depend on FastAPI, Redis, or a concrete database.

## Minimal usage

```python
from rtrq_server_core import AppConfig, InvalidationRequest, MemoryAppStore, RtrqCore

core = RtrqCore(
    apps=MemoryAppStore(
        [
            AppConfig(
                app_id="dev",
                api_key="dev-secret",
                allowed_origins=["http://localhost:3000"],
            )
        ]
    )
)

await core.invalidate(
    app_id="dev",
    api_key="dev-secret",
    request=InvalidationRequest(key=["todos"]),
)
```

## Commands

```sh
uv run pytest packages/python/server-core/tests
```

## Status

Experimental runtime behavior is implemented for in-memory development and tests.
