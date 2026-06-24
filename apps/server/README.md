# RTRQ Server

Self-hostable FastAPI server scaffold for RTRQ.

This app will expose REST invalidation endpoints, WebSocket subscription endpoints, health checks, and a
standalone admin UI for creating RTRQ apps, rotating API keys, and managing allowed browser origins.

## Security boundary

Backend SDKs call this server with an app ID and API key. Browser clients connect with an app ID only. The
server will use the app's optional origin allowlist to decide whether browser WebSocket connections should be
accepted.

## Commands

```sh
uv run rtrq-server
uv run pytest apps/server/tests
```

## Status

Scaffold only. Runtime invalidation, WebSocket subscription management, Redis fanout, app persistence, and admin
authentication are not implemented yet.
