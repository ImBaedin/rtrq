# RTRQ Monorepo

This repository contains the initial monorepo skeleton for RTRQ using Bun for the TypeScript workspace and `uv` for Python workspace management, locking, and package builds.

## Workspace Layout

```text
.
├── apps/
│   └── server/                         # FastAPI RTRQ server
├── packages/
│   ├── clients/
│   │   ├── core/                      # Framework-agnostic browser client SDK
│   │   └── adapters/
│   │       ├── react-query/           # React Query adapter package
│   │       ├── swr/                   # Placeholder for SWR adapter
│   │       ├── trpc/                  # Placeholder for tRPC adapter
│   │       └── vanilla/               # Placeholder for fetch/axios-style adapter
│   └── server-sdks/
│       ├── python/                    # Python SDK for app servers
│       ├── go/                        # Placeholder for Go SDK
│       ├── rust/                      # Placeholder for Rust SDK
│       └── typescript/                # Placeholder for TypeScript SDK
└── scripts/                           # Repo-level helper scripts
```

## Scripts

- `bun install` installs the TypeScript workspace dependencies.
- `bun run lock:py` refreshes the Python `uv.lock` file.
- `bun run setup:py` syncs the Python workspace into the repo-local `.venv/` via `uv`.
- `bun run build` builds the TypeScript packages and Python distributions.
- `bun run typecheck` runs TypeScript typechecking for the Bun workspace packages.
- `bun run dev:server` boots the FastAPI app in reload mode through `uv run`.

## Notes

- Redis wiring is intentionally not provisioned in this repository.
- The code included here is scaffolding only. It defines package boundaries, public APIs, and build surfaces without implementing the full invalidation pipeline yet.
- Python packages are managed as a `uv` workspace rooted at [pyproject.toml](./pyproject.toml).
