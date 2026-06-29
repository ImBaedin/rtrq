# @rtrq/client-core

Browser client core for RTRQ.

This package manages WebSocket connections, app ID based client setup, query key subscriptions, reconnect
behavior, and invalidation event dispatch for frontend adapters.

## Usage

```ts
import { createRtrqClient } from "@rtrq/client-core";

const client = createRtrqClient({
  appId: "dev",
  serverUrl: "http://localhost:8000",
  reconnect: true,
});

client.subscribe(["todos"], (event) => {
  console.log("invalidate", event.key, event.matchMode);
});

client.connect();
```

By default, the client uses `globalThis.WebSocket`. Tests, non-browser runtimes, or custom transports can pass a
compatible constructor with `webSocket`.

## Security boundary

Client configuration includes only the RTRQ server URL and public app ID. It must never include an API key.

## Commands

```sh
bun run build
bun run test
bun run typecheck
```

## Status

Experimental. The core WebSocket subscription and invalidation path is implemented, but the public API can still
change while adapters are built.
