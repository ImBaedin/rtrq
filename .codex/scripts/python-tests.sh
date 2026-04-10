#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for Python validation." >&2
  exit 1
fi

cd "${ROOT_DIR}"

server_tests="$(rg --files apps/server -g 'tests/**/*.py' -g 'test_*.py' -g '*_test.py' || true)"
sdk_tests="$(rg --files packages/server-sdks/python -g 'tests/**/*.py' -g 'test_*.py' -g '*_test.py' || true)"

if [[ -z "${server_tests}" && -z "${sdk_tests}" ]]; then
  echo "No Python tests found under apps/server or packages/server-sdks/python; skipping pytest."
  exit 0
fi

if [[ -n "${server_tests}" ]]; then
  uv run --project "${ROOT_DIR}" --package rtrq-server python -m pytest -q
fi

if [[ -n "${sdk_tests}" ]]; then
  uv run --project "${ROOT_DIR}" --package rtrq-server-sdk python -m pytest -q
fi
