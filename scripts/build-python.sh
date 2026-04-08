#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

uv build --project "${ROOT_DIR}" --package rtrq-server
uv build --project "${ROOT_DIR}" --package rtrq-server-sdk
