# @rtrq/server-sdk

TypeScript backend SDK scaffold for RTRQ.

This package will let Node-compatible backends send query key invalidations to an RTRQ server over REST.

## Security boundary

Server SDK configuration includes the RTRQ server URL, app ID, and API key. API keys must be stored only in
server-side configuration or secrets management.

## Commands

```sh
bun run build
bun run test
bun run typecheck
```

## Status

Scaffold only. REST invalidation behavior is not implemented yet.
