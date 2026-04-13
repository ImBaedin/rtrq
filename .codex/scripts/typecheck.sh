#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required for TypeScript validation." >&2
  exit 1
fi

cd "${ROOT_DIR}"

if [[ ! -x "${ROOT_DIR}/node_modules/.bin/tsc" ]]; then
  echo "TypeScript dependencies are not installed. Run 'bun run bootstrap' first." >&2
  exit 1
fi

bun run typecheck
