import app.models.user
import app.models.player
import app.models.club
import app.models.league
import app.models.report
import app.models.saved_prospect
import app.models.player_view
import app.models.player_contract
import app.models.password_reset_token
import app.models.player_market_value_history
import app.models.player_highlight
import app.models.notification
import app.models.mfa
import app.models.ai_usage_log
import app.models.audit_log
import app.models.ai_access_request
from app.database import Base, engine

Base.metadata.create_all(engine)
print("create_all complete.")
