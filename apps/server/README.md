# RTRQ Server

Self-hostable FastAPI server for RTRQ.

This app exposes REST invalidation endpoints, WebSocket subscription endpoints, and health checks. The
standalone admin UI remains a scaffold.

## Security boundary

Backend SDKs call this server with an app ID and API key. Browser clients connect with an app ID only. The
server will use the app's optional origin allowlist to decide whether browser WebSocket connections should be
accepted.

## Development configuration

The barebones server uses an in-memory app config loaded from environment variables:

```sh
RTRQ_APP_ID=dev
RTRQ_API_KEY=dev-secret
RTRQ_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

If `RTRQ_ALLOWED_ORIGINS` is unset, browser WebSocket origins are allowed. This is intended for local testing.

## Runtime endpoints

- `POST /v1/apps/{app_id}/invalidations` with `x-rtrq-api-key` or `Authorization: Bearer ...`.
- `WS /v1/apps/{app_id}/ws` for subscription consumers.

WebSocket clients can send:

```json
{"type": "subscribe", "key": ["todos", "list"]}
```

REST invalidations default to prefix matching:

```json
{"key": ["todos"]}
```

## Commands

```sh
uv run rtrq-server
uv run pytest apps/server/tests
```

## Status

Barebones in-memory runtime behavior is implemented. SQL-backed app persistence, Redis fanout, admin
authentication, and the admin UI are not implemented yet.
