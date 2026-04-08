# RTRQ — Real-Time React Query

## Overview

RTRQ is an open-source, real-time cache invalidation acceleration layer for React Query and other client-side data-fetching libraries. It does not replace existing cache invalidation strategies; instead, it sits alongside them and propagates invalidation signals to all connected clients the moment the application server knows data has changed. If RTRQ is unavailable or a client is disconnected, the application falls back gracefully to React Query's native stale-time and refetch behavior — degraded speed, not broken functionality.

RTRQ is self-hosted. Operators are responsible for their own infrastructure. There is no multi-tenant SaaS layer.

---

## Problem Statement

In multi-client applications, cache invalidation is inherently a fan-out problem. When Client A mutates data and the server updates its state, Clients B and C are unaware until their stale-time expires or they perform a manual refetch. This window of staleness is tolerable in many applications but is a source of real UX friction in collaborative, real-time, or high-frequency data scenarios.

The standard solution — polling or manual refetch intervals — wastes resources and still introduces latency. A push-based invalidation layer eliminates that latency without requiring developers to overhaul their data-fetching architecture.

---

## Design Goals

- **Non-breaking by default.** RTRQ accelerates invalidation; it does not own it. Removing RTRQ from the stack should require no changes to application query logic.
- **Minimal developer surface area.** Integration should be achievable through a one-time setup change (wrapping the QueryClient) with no per-query or per-mutation annotations required.
- **Self-hosted and operator-controlled.** No external dependency on a managed service. Operators bring their own infrastructure.
- **Secure by default.** Client session authentication and server-side call authentication are treated as separate concerns with separate credential mechanisms.
- **Horizontally scalable.** The architecture should support scaling out WebSocket nodes, with Redis as the pub/sub backbone between them.

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Operator Infrastructure                  │
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │  App Server  │─────▶│  RTRQ Server │◀─────│   Clients    │  │
│  │              │ HTTP │  (FastAPI +  │  WSS │  (Browser)   │  │
│  │  [Server SDK]│      │   Redis)     │      │ [Client SDK] │  │
│  └──────────────┘      └──────┬───────┘      └──────────────┘  │
│                               │                                 │
│                          ┌────▼─────┐                          │
│                          │  Redis   │                          │
│                          │ Pub/Sub  │                          │
│                          └──────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### RTRQ Server

Built with **FastAPI**, the server handles two distinct roles in a single process:

- **HTTP endpoint** — accepts inbound invalidation signals from the application server via the Server SDK. This endpoint should not be publicly exposed; network-level isolation (e.g., Docker internal networking, Kubernetes service mesh) is the recommended access control mechanism in addition to shared-secret authentication.
- **WebSocket endpoint** — maintains persistent connections with browser clients. Clients authenticate at handshake time using their existing session token (e.g., NextAuth, Clerk JWT). The server validates this token against the application's auth provider.

**Redis Pub/Sub** serves as the message backbone between WebSocket nodes. When an invalidation signal arrives at any node, it is published to Redis and fanned out to all nodes, each of which delivers it to their locally connected clients. This enables horizontal scaling of WebSocket nodes without requiring direct node-to-node communication.

### Invalidation Flow

1. A mutation completes on the application server.
2. The application server calls the RTRQ Server's HTTP endpoint via the Server SDK, passing the query key(s) to invalidate and a shared secret credential.
3. The RTRQ Server publishes the invalidation event to Redis.
4. All WebSocket nodes subscribed to Redis receive the event and identify connected clients whose subscription set intersects with the invalidated keys.
5. Matching clients receive a WebSocket message and their local Client SDK calls `invalidateQueries` with the received key(s).
6. React Query (or the equivalent library) executes its standard refetch logic.

### Query Key Semantics

Query key matching is intentionally kept **server-side dumb**. The RTRQ server treats keys as opaque strings and performs exact matching only. Hierarchical/fuzzy matching (e.g., invalidating `['todos']` to match `['todos', userId, { filter: 'active' }]`) is the responsibility of the **receiving client**, which delegates directly to React Query's native `invalidateQueries` matching logic. This keeps the server free of library-specific semantics and ensures matching behavior is always consistent with the version of React Query the client is running.

Application servers should therefore broadcast keys at the appropriate level of specificity. If broad invalidation is needed, the Server SDK should emit a key pattern that the client adapters are configured to handle.

---

## Authentication Model

Two distinct credential types are used, reflecting the different trust levels of the two caller classes.

**Client authentication (browser → WebSocket):**
Clients present their existing session token (JWT or equivalent) at WebSocket handshake time. The RTRQ Server validates this token using the same mechanism the application uses (shared secret validation, JWKS endpoint, etc.). This is configured once at server startup. Clients that fail validation are rejected at connection time.

**Server authentication (app server → HTTP endpoint):**
Application servers include a shared secret (API key) in each HTTP request to the invalidation endpoint. This key is provisioned by the operator at deploy time and is never exposed to the browser. Network isolation provides defense-in-depth — the HTTP endpoint should be unreachable from public networks regardless of credential state.

This separation ensures that no browser client can ever impersonate an application server and trigger invalidations for other users.

---

## SDK & Adapter Layer

### Server SDK

A lightweight library (initially Python to match the FastAPI server, with potential ports to Node.js/TypeScript) for application servers. Responsible for:

- Signing and sending HTTP invalidation requests to the RTRQ Server.
- Abstracting endpoint configuration and shared secret management.

### Core Client SDK

A framework-agnostic TypeScript library responsible for:

- Managing the WebSocket connection lifecycle (connect, reconnect, backoff).
- Authenticating at handshake time using the provided session token.
- Maintaining the client's subscription set.
- Receiving invalidation messages and dispatching them to registered handlers.

### React Query Adapter (MVP)

The React Query adapter wraps the QueryClient via a `createQueryClient()` factory function. This is the one required integration point — developers replace their existing QueryClient instantiation with the RTRQ-wrapped version. No per-query or per-mutation changes are required.

The adapter does two things:

- **On invalidation send:** Intercepts outbound `invalidateQueries` calls (via a proxied QueryClient or a global `MutationCache` `onSuccess` callback) and forwards them to the RTRQ Server, so that mutations by Client A are broadcast to Clients B and C.
- **On invalidation receive:** Listens to the Core Client SDK and calls the underlying QueryClient's `invalidateQueries` when a message is received, triggering React Query's native refetch flow.

---

## MVP Scope

The MVP delivers an end-to-end working system with the minimum viable component set:

| Component | MVP Status |
|---|---|
| FastAPI WebSocket + HTTP server | ✅ In scope |
| Redis Pub/Sub backbone | ✅ In scope |
| Server SDK (Python) | ✅ In scope |
| Core Client SDK (TypeScript) | ✅ In scope |
| React Query adapter | ✅ In scope |
| tRPC adapter | 🔜 Post-MVP |
| SWR adapter | 🔜 Post-MVP |
| Vanilla (fetch/axios) adapter | 🔜 Post-MVP |
| Server SDK (Node.js/TypeScript) | 🔜 Post-MVP |
| Management dashboard | 🔜 Post-MVP |
| Usage analytics | 🔜 Post-MVP |

Adapter breadth should be driven by demand. Additional adapters will be added once the MVP has real users to inform priority.

---

## Future Enhancements

### Additional Adapters
tRPC, SWR, vanilla fetch, and Tanstack Query (Vue/Svelte) adapters following the same Core Client SDK integration pattern.

### Server SDK Ports
A Node.js/TypeScript Server SDK to support Next.js API routes, Express, and other JS backend environments without requiring Python.

### Federated Server Topology
Support for multiple RTRQ Server deployments (e.g., regional) that share invalidation events across deployments. Redis Pub/Sub already enables this within a single cluster; cross-cluster federation would require a dedicated design document.

### Management Dashboard
A self-hosted web UI providing:
- Connected client counts per application
- Invalidation event throughput metrics
- Subscription key inspection
- Credential rotation for shared secrets

### Payload Push (Optional Enhancement)
Rather than invalidation-only signals (which cause a client refetch), the server could optionally push the updated data payload directly. This would allow the client adapter to seed the React Query cache without a second round-trip. This is a significant design addition and should be treated as a separate feature with its own design document, as it introduces data serialization, payload size, and security considerations.

### Fine-Grained Subscription Authorization
For applications requiring server-enforced subscription scoping (e.g., preventing one user's client from subscribing to another user's query keys), a signed subscription token model can be introduced. The application server would issue short-lived tokens scoping a client to a set of key patterns, which the RTRQ Server would validate at subscription time.

---

## Deployment Model

RTRQ is distributed as a set of Docker images and language-specific SDK packages. A reference `docker-compose.yml` will be provided for local development and simple single-node production deployments. Kubernetes helm charts are a future consideration.

Operators are expected to:
- Run and maintain their own RTRQ Server instance(s).
- Provision and manage their own Redis instance.
- Ensure the HTTP invalidation endpoint is not publicly reachable.
- Rotate shared secrets on their own schedule.

---

## Non-Goals

- RTRQ is not a general-purpose WebSocket framework or pub/sub broker.
- RTRQ does not store or log query data, payloads, or user session information beyond what is necessary for connection management.
- RTRQ does not attempt to guarantee exactly-once delivery of invalidation signals. At-least-once delivery is acceptable; clients that receive a duplicate invalidation signal will simply trigger an idempotent refetch.
- RTRQ does not enforce which query keys an application server is permitted to invalidate. That is the operator's responsibility via network isolation and credential management.
