# Security Notes

RTRQ's first security boundary is app-level isolation. Every RTRQ app has a public app ID, a private API key,
and an optional list of allowed browser origins.

## Backend SDKs

Backend SDKs must be configured with:

- RTRQ server URL
- App ID
- API key

The API key authenticates invalidation writes and must stay server-side.

## Frontend adapters

Frontend adapters must be configured with:

- RTRQ server URL
- App ID

Frontend adapters must not receive API keys. Browser WebSocket connections can be checked against an app's
allowed origin list when configured.

## Origin allowlists

Origin allowlists are an optional guard for browser WebSocket connections. Store normalized origins such as
`https://app.example.com`. Avoid matching loose domain fragments.

Origin checks help reduce accidental or malicious browser-based subscription attempts. They do not authenticate
REST invalidation writes and are not a substitute for API key verification.

## Future hardening

Planned implementation work should include key hashing, key rotation, revoked-key tracking, rate limiting,
audit events, TLS guidance, admin authentication, and explicit SaaS tenant boundaries.
