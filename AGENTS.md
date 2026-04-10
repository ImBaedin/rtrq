## Repository Contract

- Product and architecture source of truth: `RTRQ.md`.
- Workspace layout, package locations, and top-level scripts: `README.md`.
- Package manifests and existing source files define the executable contract when docs and code diverge.
- Nested `AGENTS.md` files override this file for their subtree. Today that mainly applies to `apps/server/`.

## What RTRQ Is

- RTRQ is a self-hosted real-time cache invalidation layer. It accelerates invalidation for React Query-style clients; it does not replace the application's existing fetch and refetch logic.
- The core architecture is: app server calls RTRQ over HTTP, RTRQ fans invalidations out over WebSockets, Redis is the future inter-node backbone, and client adapters trigger library-native invalidation behavior.
- Preserve the "degraded speed, not broken functionality" design goal. New work should fail-safe when RTRQ is unavailable.

## Active Surfaces

- `apps/server` is an active FastAPI package and the main server surface.
- `packages/server-sdks/python` is an active package and should stay aligned with the server's HTTP contract.
- `packages/clients/core` is an active package for browser transport/lifecycle concerns.
- `packages/clients/adapters/react-query` is an active package for React Query integration.

## Placeholder Surfaces

- Treat these as placeholders unless the user explicitly asks to work on them: `packages/server-sdks/go`, `packages/server-sdks/rust`, `packages/server-sdks/typescript`, `packages/clients/adapters/swr`, `packages/clients/adapters/trpc`, `packages/clients/adapters/vanilla`.
- Do not add broad scaffolding, parity APIs, or speculative documentation for placeholder packages as incidental cleanup.

## Tooling

- Python tooling is standardized on `uv`. Use `uv sync`, `uv run`, and `uv build`; do not introduce ad hoc `venv` or `pip` flows.
- TypeScript tooling is standardized on Bun. Use `bun install` and `bun run ...`.
- Prefer `rg` for repo search.
- Respect existing package boundaries. Prefer small, contract-driven changes over broad reshuffles.

## Workflow Expectations

- Prefer test-driven development for new work when practical: add or update tests first, implement against them, then rerun the relevant scope.
- If you change a cross-package contract, update the affected server, SDK, adapter, and docs in the same slice when feasible.
- Keep public shapes consistent across the FastAPI models, Python SDK payloads, and TypeScript client types.
- Do not treat scaffold comments or placeholder READMEs as product truth. `RTRQ.md` wins.
- When working in a subtree with its own `AGENTS.md`, read and follow that file before editing.

## Validation

- For Python package changes, run the smallest relevant `uv run` validation first, then broaden as needed.
- For TypeScript package changes, run the smallest relevant `bun run` validation first, then broaden as needed.
- For cross-package or protocol changes, validate both Python and TypeScript surfaces touched by the change.
- If a required tool or dependency is missing, fix the environment when it is safe to do so; otherwise report the exact missing prerequisite.

## Definition Of Done

- The changed surface is implemented coherently rather than partially sketched.
- Relevant tests or typechecks were run, or the exact validation gap is called out.
- Docs are updated when behavior, contracts, or setup changed.
- New work does not silently drift from the architecture and package roles described in `RTRQ.md`.
