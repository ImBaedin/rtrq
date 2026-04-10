#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for Python validation." >&2
  exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "rg is required for Python validation." >&2
  exit 1
fi

cd "${ROOT_DIR}"

find_tests() {
  local search_root="$1"
  local output
  local status

  set +e
  output="$(rg --files "${search_root}" -g 'tests/**/*.py' -g 'test_*.py' -g '*_test.py')"
  status=$?
  set -e

  if [[ "${status}" -gt 1 ]]; then
    return "${status}"
  fi

  printf '%s' "${output}"
}

server_tests="$(find_tests apps/server)"
sdk_tests="$(find_tests packages/server-sdks/python)"

if [[ -z "${server_tests}" && -z "${sdk_tests}" ]]; then
  echo "No Python tests found under apps/server or packages/server-sdks/python; skipping pytest."
  exit 0
fi

if [[ -n "${server_tests}" ]]; then
  uv run --project "${ROOT_DIR}" --package rtrq-server python -m pytest -q "${ROOT_DIR}/apps/server"
fi

if [[ -n "${sdk_tests}" ]]; then
  uv run --project "${ROOT_DIR}" --package rtrq-server-sdk python -m pytest -q "${ROOT_DIR}/packages/server-sdks/python"
fi
