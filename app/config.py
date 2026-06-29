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


settings = Settings()
