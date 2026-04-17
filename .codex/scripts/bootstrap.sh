#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required for this repository." >&2
  exit 1
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for this repository." >&2
  exit 1
fi

cd "${ROOT_DIR}"

bun install --frozen-lockfile
uv sync --project "${ROOT_DIR}" --all-packages --all-groups
