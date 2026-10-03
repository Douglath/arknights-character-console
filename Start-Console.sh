#!/usr/bin/env bash
set -e
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3.10 or newer is required. Install it from https://www.python.org/downloads/" >&2
  exit 1
fi
exec python3 roster/serve.py "$@"
