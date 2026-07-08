#!/usr/bin/env bash
set -euo pipefail

python bootstrap_create_all.py

python -m app.migrations.add_player_stats_and_history
python -m app.migrations.redesign_contracts
python -m app.migrations.add_telegram_fields

echo "Database bootstrap complete. Now set ADMIN_EMAIL / ADMIN_PASSWORD and run:"
echo "  python migrations/create_global_admin.py"
