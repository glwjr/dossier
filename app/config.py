from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_SECRET_KEY = "dev-secret-key-change-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./dossier.db"
    dev_user_email: str = "dev@example.com"
    secret_key: str = _DEFAULT_SECRET_KEY
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/auth/callback"
    frontend_url: str = ""
    admin_email: str = ""
    # Ephemeral demo login: /auth/demo clones this user's data into a throwaway
    # account. Leave blank to disable the demo endpoint entirely.
    demo_template_email: str = ""
    # Demo accounts older than this are garbage-collected. Kept >= the token
    # lifetime (access_token_expire_minutes) so a session's data never vanishes
    # mid-use.
    demo_ttl_hours: int = 24 * 7
    # Hard ceiling on live demo accounts — the oldest are evicted past this to
    # bound DB bloat (each demo login writes ~150 rows).
    demo_max_users: int = 500
    # Per-IP cap on POST /auth/demo per minute (0 disables). Each request clones
    # ~150 rows, so this bounds the churn a single client can cause.
    demo_rate_limit_per_minute: int = 10
    # Error tracking. Blank disables Sentry entirely (dev/test default).
    sentry_dsn: str = ""
    # Fraction of requests traced for performance (0 = errors only).
    sentry_traces_sample_rate: float = 0.0

    @model_validator(mode="after")
    def _require_secret_key_in_prod(self) -> "Settings":
        # frontend_url is only set in deployed environments; refuse to start
        # there with the guessable dev signing key.
        if self.frontend_url and self.secret_key == _DEFAULT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY must be set to a non-default value in production "
                "(FRONTEND_URL is configured but SECRET_KEY is still the dev default)"
            )
        return self

    @model_validator(mode="after")
    def _demo_ttl_covers_token_lifetime(self) -> "Settings":
        # A demo account GC'd before its JWT expires would 401 a live session
        # mid-use, so the TTL must be at least the token lifetime.
        if self.demo_ttl_hours * 60 < self.access_token_expire_minutes:
            raise ValueError(
                "DEMO_TTL_HOURS must be >= the token lifetime "
                "(access_token_expire_minutes) so demo data isn't purged "
                "mid-session"
            )
        return self


settings = Settings()
