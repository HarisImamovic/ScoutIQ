from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    allowed_origins: str = "http://localhost:8080"
    debug: bool = False
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8080/auth/google/callback"
    resend_api_key: str = ""
    resend_from_email: str = "ScoutIQ <noreply@scoutiq.tech>"
    frontend_url: str = "http://localhost:8080"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    ai_system_prompt: str = "You are a professional AI scouting assistant for ScoutIQ. Answer only football scouting questions using the data provided. Decline all other requests. Format responses in GitHub-flavored Markdown and use tables when listing or comparing players. When ranking players, compare values across the entire list and include all tied players."
    groq_request_timeout: int = 30
    ai_daily_request_limit: int = 50
    ai_requests_per_minute: int = 10
    ai_global_daily_request_limit: int = 900
    ai_max_players_context: int = 150
    ai_max_reports_context: int = 20
    ai_max_prospects_context: int = 30
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_mode: str = "polling"
    telegram_webhook_base_url: str = ""
    telegram_webhook_secret: str = ""
    mfa_enforced: bool = True
    mfa_encryption_key: str = ""
    mfa_token_expire_minutes: int = 10
    mfa_challenge_expire_minutes: int = 5
    mfa_challenge_max_attempts: int = 5
    mfa_recovery_code_count: int = 10
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    login_max_failed_attempts: int = 5
    login_lockout_minutes: int = 15
    max_request_body_bytes: int = 8 * 1024 * 1024
    enable_hsts: bool = False

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def telegram_webhook_url(self) -> str:
        base = self.telegram_webhook_base_url.rstrip("/")
        return f"{base}/api/v1/telegram/webhook" if base else ""

    @property
    def telegram_webhook_enabled(self) -> bool:
        return bool(self.telegram_bot_token) and self.telegram_mode.lower() == "webhook"

    def validate_for_production(self) -> list[str]:
        problems: list[str] = []
        if self.debug:
            problems.append("DEBUG must be false in production.")
        if len(self.jwt_secret_key) < 32:
            problems.append("JWT_SECRET_KEY must be at least 32 characters.")
        weak = {"", "change-this-to-a-random-secret-at-least-32-characters-long", "secret", "changeme"}
        if self.jwt_secret_key in weak:
            problems.append("JWT_SECRET_KEY is a default/placeholder value; set a strong random secret.")
        if any("localhost" in o or "127.0.0.1" in o for o in self.origins_list):
            problems.append("ALLOWED_ORIGINS still contains localhost; set production origins.")
        if self.telegram_bot_token and self.telegram_mode.lower() == "webhook":
            if not self.telegram_webhook_base_url:
                problems.append("TELEGRAM_WEBHOOK_BASE_URL is required when TELEGRAM_MODE=webhook.")
            elif not self.telegram_webhook_base_url.lower().startswith("https://"):
                problems.append("TELEGRAM_WEBHOOK_BASE_URL must be an HTTPS URL.")
            if not self.telegram_webhook_secret:
                problems.append("TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_MODE=webhook.")
        return problems

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
