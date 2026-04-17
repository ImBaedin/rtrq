#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for Python type validation." >&2
  exit 1
fi

cd "${ROOT_DIR}"

uv run --project "${ROOT_DIR}" --package rtrq-server ty check "${ROOT_DIR}/apps/server/src" "${ROOT_DIR}/apps/server/tests"
uv run --project "${ROOT_DIR}" --package rtrq-server-sdk ty check "${ROOT_DIR}/packages/server-sdks/python/src" "${ROOT_DIR}/packages/server-sdks/python/tests"
