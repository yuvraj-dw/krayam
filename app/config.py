from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # SMS Gate
    SMS_GATE_API_URL: str = "https://api.sms-gate.app/3rdparty/v1"
    SMS_GATE_USERNAME: str = ""
    SMS_GATE_PASSWORD: str = ""

    # Auth
    JWT_SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # OTP
    OTP_LENGTH: int = 6
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3
    OTP_RESEND_COOLDOWN_SECONDS: int = 60

    # App
    APP_NAME: str = "AgriProcurement"
    DEBUG: bool = False
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Natural-language SMS (Gemini via OpenAI-compatible endpoint)
    LLM_ENABLED: bool = False
    LLM_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-3-flash-preview"
    LLM_TIMEOUT_SECONDS: float = 30.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
