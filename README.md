# RTRQ

RTRQ is a cross-client query invalidation system for application architectures that do not natively provide
realtime cache reactivity. It lets backend code invalidate a serializable query key, routes that invalidation
through an RTRQ server, and notifies connected clients that are subscribed to the same key.

RTRQ is designed to avoid handling customer records. It routes invalidation keys, connection metadata, and
subscription state, while application data stays in the customer's systems.

## How it works

1. A backend SDK is configured with an RTRQ server URL, app ID, and API key.
2. Backend application code invalidates a query key after mutating its own data.
3. The RTRQ server receives the invalidation over REST and authenticates the API key for that app.
4. Browser clients connect over WebSocket with the RTRQ server URL and public app ID.
5. The RTRQ server sends invalidation events to connected clients subscribed to the matching key.
6. Client adapters trigger their framework query layer to refetch data from the customer's backend.

Redis is reserved for coordinating subscriptions and invalidations across multiple RTRQ server instances.

## Security model

Standalone RTRQ servers include an admin UI for creating multiple RTRQ apps. Each app has:

- `appId`: public identifier used by browser clients and backend SDKs.
- `apiKey`: server-side secret used only by backend SDKs for REST invalidation requests.
- `allowedOrigins`: optional browser Origin allowlist for WebSocket connections.

Frontend adapters only receive the RTRQ server URL and app ID. API keys must never be included in browser
bundles. Origin allowlists help prevent arbitrary websites from opening browser WebSocket subscriptions for an
app, but they do not replace API key authentication for writes.

## Monorepo layout

```text
apps/
  server/                  Self-hostable FastAPI RTRQ server and standalone admin UI scaffold.
  docs/                    Documentation site scaffold.
demos/
  next-react-query/        Next.js and TanStack Query demo scaffold.
  fastapi-react/           FastAPI backend plus React frontend demo scaffold.
packages/
  typescript/
    shared/                Shared TypeScript protocol and package types.
    client-core/           Browser client core scaffold.
    adapter-react-query/   TanStack Query adapter scaffold.
    server-sdk/            TypeScript backend SDK scaffold.
  python/
    server-core/           Python server core scaffold.
    server-sdk/            Python backend SDK scaffold.
    client-core/           Reserved Python client core scaffold.
tooling/
  typescript-config/       Shared TypeScript configs.
  eslint-config/           Shared ESLint config.
  python/                  Reserved Python tooling area.
```

## Commands

Install JavaScript dependencies:

```sh
bun install
```

Install Python workspace dependencies:

```sh
uv sync --all-packages
```

Run checks:

```sh
bun run lint
bun run typecheck
bun run test
```

Run all TypeScript dev servers through Turbo:

```sh
bun run dev
```

Run the FastAPI server scaffold:

```sh
uv run rtrq-server
```

## Scaffold status

This repository currently contains project boundaries, package manifests, placeholder entry points, tests, and
documentation. It intentionally does not implement RTRQ runtime behavior yet.
