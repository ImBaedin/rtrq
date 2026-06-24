# @rtrq/client-core

Browser client core scaffold for RTRQ.

This package will manage WebSocket connections, app ID based client setup, query key subscriptions, reconnect
behavior, and invalidation event dispatch for frontend adapters.

## Security boundary

Client configuration includes only the RTRQ server URL and public app ID. It must never include an API key.

## Commands

```sh
bun run build
bun run test
bun run typecheck
```

## Status

Scaffold only. WebSocket behavior and subscription management are not implemented yet.
