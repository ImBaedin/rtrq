# Shared Protocol Fixtures

This directory contains repo-owned contract fixtures for RTRQ's active protocol surfaces.

Ownership:

- The repository owns these fixtures as durable technical contract examples.
- Changes here should stay aligned with `RTRQ.md`, `INVARIANTS.md`, and `VALIDATION.md`.
- If a protocol rule changes, update the docs and these fixtures in the same change.

Intended consumers:

- Python validation in `apps/server/tests`
- Python validation in `packages/server-sdks/python/tests`
- TypeScript validation via `scripts/validate-protocol-fixtures.ts`
- Future protocol conformance and end-to-end harnesses

Fixture files:

- `topics.json`: valid and invalid canonical topic examples
- `websocket-messages.json`: valid and invalid MVP WebSocket message examples
- `http-invalidation.json`: HTTP invalidation request and response examples for the active server and Python SDK contract

Format notes:

- Valid examples use JSON-native values so multiple languages can load them directly.
- Invalid wire examples use `jsonText` strings when the example cannot be represented as valid JSON data.
- Example credentials are placeholders only. They are test fixtures, not real secrets.
