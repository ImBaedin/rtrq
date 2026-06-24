# rtrq-server-sdk

Python backend SDK scaffold for RTRQ.

This package will let Python backends send query key invalidations to an RTRQ server over REST.

## Security boundary

Server SDK configuration includes the RTRQ server URL, app ID, and API key. API keys must stay server-side.

## Commands

```sh
uv run pytest packages/python/server-sdk/tests
```

## Status

Scaffold only. REST invalidation behavior is not implemented yet.
