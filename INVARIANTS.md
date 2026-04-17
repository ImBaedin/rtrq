# RTRQ Invariants

This document records the durable technical invariants that future changes must preserve unless the product architecture is intentionally revised.

These invariants are the human-readable source material for future tests, schema checks, and structural enforcement. They are not task plans or implementation notes.

## Contract Invariants

- Cross-process protocol identity is a canonical topic string, not a raw library-owned query-key object.
- A topic string is the canonical JSON serialization of a logical query-key array.
- The logical query-key grammar for the MVP is constrained:
  - the top-level value is an array
  - array elements and nested values are valid JSON values only
  - object keys are strings
  - arrays preserve order
  - values outside the JSON data model are not transportable
- Object segments are treated as unordered maps for protocol identity. Logically equivalent objects must canonicalize to the same topic string regardless of source key order.
- Cross-process boundaries use topic strings. Structured logical keys may exist inside adapters, but they are not the transport identity.
- Broad invalidation is represented by shorter logical key prefixes and their corresponding canonical topic strings.
- The HTTP invalidation contract must stay aligned between the FastAPI server and active server SDKs.
- Accepted HTTP invalidation requests return `200 OK`. This confirms request acceptance only, not client delivery.
- Once the WebSocket transport in `apps/server` is wired, the WebSocket protocol is limited to the documented MVP message taxonomy unless the protocol is intentionally revised:
  - client to server: `subscribe`, `unsubscribe`
  - server to client: `ready`, `subscription_ack`, `invalidation`, `error`
- Once that transport is wired, `invalidation` messages carry `topics: string[]`, not a single scalar topic.
- Once that transport is wired, `subscription_ack.topic_count` is the number of unique validated topics in the accepted request payload. It is not the number of server-side state changes.
- Once that transport is wired, each client subscription mutation receives exactly one terminal response from the server:
  - `subscription_ack` if accepted
  - `error` if invalid or rejected
- Once that transport is wired, RTRQ does not send both `subscription_ack` and `error` for the same `op_id`.

## Responsibility Invariants

- The RTRQ server performs exact string matching only for topic delivery. It does not implement library-specific fuzzy or hierarchical query matching.
- Canonicalization happens before topic identity is used for matching, subscription, or invalidation fan-out.
- The server owns HTTP invalidation ingress and WebSocket delivery, not client-library query semantics.
- The core client owns WebSocket connection lifecycle and subscription transport behavior.
- Client subscription mutations are carried over the authenticated WebSocket connection in the MVP. RTRQ does not expose a separate browser HTTP API for subscribe or unsubscribe.
- The React Query adapter owns derivation of topic subscriptions from cached query usage.
- The React Query adapter owns translation from received topic strings back into library-native `invalidateQueries` calls.
- Server-side subscription state is connection-scoped, not user-scoped.
- Server-side subscription state behaves as a set:
  - subscribing to an already-present topic is a no-op
  - unsubscribing from an absent topic is a no-op
  - duplicate topics in a single mutation do not create multiple entries
- The MVP authenticates browser connections but does not enforce fine-grained authorization for individual topic subscriptions.

## Failure-Mode Invariants

- RTRQ preserves the product goal of degraded speed, not broken functionality. If RTRQ is unavailable, application fetch and refetch behavior must remain correct without RTRQ-specific recovery logic.
- At-least-once invalidation signaling is acceptable. Duplicate invalidation delivery is expected to be safe and idempotent on the client side.
- If a query key cannot be canonicalized into a topic string, adapters must fail safe by preserving local library behavior without RTRQ transport for that key.
- RTRQ does not guarantee replay of missed invalidations in the MVP.
- Invalidation delivery may race with subscription mutations or disconnects. Missed invalidations in those windows are tolerated in the MVP.
- Subscription state is not durable across disconnects. Reconnect requires the client to replay its current subscription set.
- Authentication failure for browser connections is handled at handshake or connection level, not as a normal post-auth application message in the MVP.
- Invalid subscription mutation messages fail as whole operations. The MVP does not use partial-success responses for malformed or mixed-validity subscription payloads.

## Scope Notes

- These invariants apply to active surfaces only: `apps/server`, `packages/server-sdks/python`, `packages/clients/core`, and `packages/clients/adapters/react-query`.
- Placeholder packages do not expand the protocol or architecture by implication.
- If a future change intentionally breaks one of these invariants, the invariant must be updated in the same change that revises the contract.
