# RTRQ Validation Contract

This document defines what repository-owned bootstrap and validation entrypoints must do for RTRQ.

It is the durable source of truth for validation scope and expectations. Repo scripts, local environment actions, and future CI should be brought into alignment with this contract. If the current harness falls short, the harness is wrong, not the contract.

## Goals

- Give humans and agents one shared understanding of what "validated" means in this repository.
- Keep validation aligned with RTRQ's active surfaces and documented protocol contract.
- Prefer the smallest relevant validation during local development, with one higher-confidence aggregate validation entrypoint for broad checks.
- Keep local validation and future CI behavior as close as practical.

## Active Validation Scope

This contract applies to the active surfaces only:

- `apps/server`
- `packages/server-sdks/python`
- `packages/clients/core`
- `packages/clients/adapters/react-query`

Placeholder packages do not expand the default validation surface unless they become active work.

## Canonical Entry Points

The repository should expose these repo-owned entrypoints:

- `bootstrap`
  - Purpose: prepare a fresh worktree so active validation can run successfully.
  - Current intended entrypoint: `.codex/scripts/bootstrap.sh`
- `validate`
  - Purpose: run the default high-confidence validation suite for the active repository surface.
  - Current intended entrypoint: `.codex/scripts/validate.sh`
- `typecheck`
  - Purpose: run TypeScript type validation for active client packages.
  - Current intended entrypoint: `.codex/scripts/typecheck.sh`
- `python-tests`
  - Purpose: run Python tests for active Python packages.
  - Current intended entrypoint: `.codex/scripts/python-tests.sh`

The top-level package-manager flows and the `.codex` action scripts must agree on the commands these entrypoints execute.

## Bootstrap Contract

`bootstrap` must make a fresh clone ready for active development and validation by:

- installing Bun workspace dependencies for active TypeScript packages
- syncing the `uv` workspace for active Python packages and dev dependencies
- failing clearly when required tools such as `bun` or `uv` are unavailable

`bootstrap` is successful when a fresh worktree can proceed directly to the relevant validation commands without manual package-manager recovery steps.

## Validate Contract

`validate` is the default aggregate validation command. It must fail fast on any failed sub-check and should cover the active repository surfaces with enough confidence for normal development work.

`validate` must include:

1. TypeScript type validation for active client packages.
2. Python lint validation for active Python packages.
3. Python type validation for active Python packages.
4. Python tests for active Python packages.
5. Lightweight smoke validation for critical Python entrypoints.

`validate` may grow over time to include more checks, but it should remain a practical default command for local development rather than becoming a slow, release-only workflow.

## Required Validation Layers

Type validation is currently required for:

- TypeScript
- Python

Additional languages should join the default type-validation surface when their server SDKs or other active package surfaces are implemented.

### TypeScript

The default TypeScript validation layer is `tsc`-based typechecking for:

- `packages/clients/core`
- `packages/clients/adapters/react-query`

The current repository does not define a TypeScript linter. Until that changes, TypeScript correctness is enforced through typechecking and targeted tests.

### Python

The default Python validation layers are:

- `ruff check` for active Python packages
- `ty` for active Python packages
- `pytest` for active Python packages

Ruff is the standard Python lint layer for this repository. `ty` is the intended Python typechecking layer so the Python toolchain stays aligned with the Astral ecosystem where practical.

The default Python lint and type layers should cover:

- `apps/server`
- `packages/server-sdks/python`

Python tests should run the smallest relevant package scope first, then broaden when a change crosses package boundaries.

### Smoke Checks

The aggregate validation command should include lightweight import or construction smoke checks for critical entrypoints, such as:

- the FastAPI application factory in `apps/server`
- the Python server SDK configuration surface

Smoke checks are not substitutes for behavior tests. They exist to catch obvious wiring failures early.

## Protocol And Cross-Package Validation

When a change touches RTRQ's documented protocol, validation must cover every active surface affected by that contract.

At minimum, protocol changes should validate:

- FastAPI request and response models
- Python SDK request payloads and expectations
- TypeScript client-side protocol handling for active client packages
- any shared fixtures or schema examples introduced for protocol enforcement

Once shared protocol fixtures exist, they should become the primary contract examples consumed by both Python and TypeScript validation.

## Validation Selection Rules

Developers and agents should prefer the smallest relevant validation that matches the change surface:

- Python-only change in one package:
  - run Ruff, Python type validation, and tests for that package first
- TypeScript-only change:
  - run active TypeScript type validation first
- Cross-package or protocol change:
  - run both Python and TypeScript validation for the affected active surfaces
- Broad repository changes or handoff validation:
  - run the aggregate `validate` command

If a check is skipped, the reason should be explicit.

## Current Gaps

This contract is normative even when the current harness does not fully satisfy it.

Known near-term work includes:

- making the repo-owned aggregate validation command reliably green in fresh worktrees
- wiring Ruff and `ty` consistently across both active Python packages
- adding shared protocol fixtures and TypeScript protocol conformance tests
- adding an end-to-end invalidation proof path
- aligning future CI to this contract once the local harness is trustworthy

## CI Alignment

Future CI should mirror the repo-owned local validation entrypoints rather than inventing separate quality gates.

CI should be added only after the local harness is reproducible and trustworthy. CI should not become the first place broken validation is discovered.
