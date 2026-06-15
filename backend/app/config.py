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
    gmail_user: str = ""
    gmail_app_password: str = ""
    frontend_url: str = "http://localhost:8080"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    ai_system_prompt: str = "You are a professional AI scouting assistant for ScoutIQ. Answer only football scouting questions using the data provided. Decline all other requests."
    groq_request_timeout: int = 30
    ai_daily_request_limit: int = 50
    ai_requests_per_minute: int = 10
    ai_max_players_context: int = 40
    ai_max_reports_context: int = 20
    ai_max_prospects_context: int = 30
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    model_config = {"env_file": ".env", "case_sensitive": False, "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
