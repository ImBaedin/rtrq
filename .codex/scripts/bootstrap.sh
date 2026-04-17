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

bun --eval '
const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const message = "The npm package \"tsc\" shadows the real TypeScript compiler. Remove it and rely on the \"typescript\" package instead.";
const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

function readPackageJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hasShadowingTsc(pkg) {
  return sections.some((section) => pkg[section]?.tsc);
}

const rootPackagePath = path.join(rootDir, "package.json");
const rootPackage = readPackageJson(rootPackagePath);
const packageJsonPaths = [rootPackagePath];

for (const workspaceEntry of rootPackage.workspaces ?? []) {
  if (workspaceEntry.endsWith("/*")) {
    const workspaceRoot = path.join(rootDir, workspaceEntry.slice(0, -2));

    for (const dirent of fs.readdirSync(workspaceRoot, { withFileTypes: true })) {
      if (!dirent.isDirectory()) {
        continue;
      }

      const packagePath = path.join(workspaceRoot, dirent.name, "package.json");
      if (fs.existsSync(packagePath)) {
        packageJsonPaths.push(packagePath);
      }
    }
    continue;
  }

  const packagePath = path.join(rootDir, workspaceEntry, "package.json");
  if (fs.existsSync(packagePath)) {
    packageJsonPaths.push(packagePath);
  }
}

for (const packagePath of packageJsonPaths) {
  const pkg = readPackageJson(packagePath);
  if (hasShadowingTsc(pkg)) {
    console.error(message);
    process.exit(1);
  }
}
'

bun install --frozen-lockfile

if [[ -e "${ROOT_DIR}/node_modules/tsc/package.json" ]]; then
  echo "Found node_modules/tsc after install. This package shadows the real TypeScript compiler; remove the stale install state and rerun bootstrap." >&2
  exit 1
fi

uv sync --project "${ROOT_DIR}" --all-packages --all-groups
