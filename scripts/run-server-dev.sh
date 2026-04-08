#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

exec uv run --project "${ROOT_DIR}" --package rtrq-server -- \
  python -m uvicorn rtrq_server.main:app --app-dir "${ROOT_DIR}/apps/server/src" --reload
