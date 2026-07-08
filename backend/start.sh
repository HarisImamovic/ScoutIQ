#!/usr/bin/env bash
set -euo pipefail

python bootstrap_create_all.py

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
