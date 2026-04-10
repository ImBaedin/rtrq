#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required for repository builds." >&2
  exit 1
fi

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for repository builds." >&2
  exit 1
fi

cd "${ROOT_DIR}"

bun run build
