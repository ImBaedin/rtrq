# @rtrq/adapter-react-query

TanStack Query adapter for RTRQ.

This package bridges `@rtrq/client-core` invalidation events to TanStack Query invalidation behavior.

## Minimal usage

```tsx
import { useRtrqReactQuery } from "@rtrq/adapter-react-query";
import { useQueryClient } from "@tanstack/react-query";

function RtrqBridge() {
  const queryClient = useQueryClient();

  useRtrqReactQuery({
    appId: "dev",
    keys: [["todos"]],
    queryClient,
    reconnect: true,
    serverUrl: "http://localhost:8000",
  });

  return null;
}
```

## Commands

```sh
bun run build
bun run test
bun run typecheck
```

## Status

Experimental. The adapter invalidates TanStack Query keys from RTRQ websocket events.
