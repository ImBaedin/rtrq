#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

"${ROOT_DIR}/.codex/scripts/typecheck.sh"
"${ROOT_DIR}/.codex/scripts/python-tests.sh"

uv run --project "${ROOT_DIR}" --package rtrq-server python -c "from rtrq_server.app import create_app; app = create_app(); print(app.title)"
uv run --project "${ROOT_DIR}" --package rtrq-server-sdk python -c "from rtrq_server_sdk.client import RTRQServerSDKConfig; print(RTRQServerSDKConfig(base_url='http://localhost:8000', shared_secret='x').api_prefix)"
