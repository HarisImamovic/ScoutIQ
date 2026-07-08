#!/usr/bin/env bash
set -euo pipefail

python -c "
import app.models.user, app.models.player, app.models.club, app.models.league, app.models.report, \
    app.models.saved_prospect, app.models.player_view, app.models.player_contract, \
    app.models.password_reset_token, app.models.player_market_value_history, app.models.player_highlight, \
    app.models.notification, app.models.mfa, app.models.ai_usage_log, app.models.audit_log, \
    app.models.ai_access_request
from app.database import Base, engine
Base.metadata.create_all(engine)
"

python -m app.migrations.add_player_stats_and_history
python -m app.migrations.redesign_contracts
python -m app.migrations.add_telegram_fields

echo "Database bootstrap complete. Now set ADMIN_EMAIL / ADMIN_PASSWORD and run:"
echo "  python migrations/create_global_admin.py"
