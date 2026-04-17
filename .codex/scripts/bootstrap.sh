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

if bun --eval 'const fs = require("fs"); const pkg = JSON.parse(fs.readFileSync("package.json", "utf8")); const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]; const bad = sections.find((section) => pkg[section]?.tsc); if (bad) { console.error("The npm package \"tsc\" shadows the real TypeScript compiler. Remove it and rely on the \"typescript\" package instead."); process.exit(1); }'; then
  :
else
  exit 1
fi

bun install --frozen-lockfile

if [[ -e "${ROOT_DIR}/node_modules/tsc/package.json" ]]; then
  echo "Found node_modules/tsc after install. This package shadows the real TypeScript compiler; remove the stale install state and rerun bootstrap." >&2
  exit 1
fi

uv sync --project "${ROOT_DIR}" --all-packages --all-groups
