#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for repository validation." >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required for repository validation." >&2
  exit 1
fi

"${ROOT_DIR}/.codex/scripts/typecheck.sh"
cd "${ROOT_DIR}"
bun run validate:protocol-fixtures:ts
"${ROOT_DIR}/.codex/scripts/python-lint.sh"
"${ROOT_DIR}/.codex/scripts/python-typecheck.sh"
"${ROOT_DIR}/.codex/scripts/python-tests.sh"

uv run --project "${ROOT_DIR}" --package rtrq-server python -c "from rtrq_server.app import create_app; app = create_app(); print(app.title)"
uv run --project "${ROOT_DIR}" --package rtrq-server-sdk python -c "from rtrq_server_sdk.client import RTRQServerSDKConfig; print(RTRQServerSDKConfig(base_url='http://localhost:8000', shared_secret='x').api_prefix)"
