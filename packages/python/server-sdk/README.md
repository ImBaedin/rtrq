# rtrq-server-sdk

Python backend SDK for sending RTRQ invalidations from server-side Python code.

This package lets Python backends send query key invalidations to an RTRQ server over REST.

## Security boundary

Server SDK configuration includes the RTRQ server URL, app ID, and API key. API keys must stay server-side.

## Usage

```python
from rtrq_server_sdk import RtrqClient, ServerSdkConfig


async def invalidate_todos() -> None:
    async with RtrqClient(
        ServerSdkConfig(
            app_id="dev",
            api_key="dev-secret",
            server_url="http://localhost:8000",
        )
    ) as client:
        result = await client.invalidate(["todos"], match_mode="prefix")
        print(result.status, result.delivered)
```

`invalidate` sends:

```json
{"key": ["todos"], "matchMode": "prefix"}
```

to `POST /v1/apps/{app_id}/invalidations` with the `X-RTRQ-API-Key` header.

## Commands

```sh
uv run pytest packages/python/server-sdk/tests
```

## Status

Experimental async REST invalidation client.
