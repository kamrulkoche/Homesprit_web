"""Application configuration using Pydantic Settings.

Configuration is loaded in order (later overrides earlier):
1. config/.env.base (common settings for all environments)
2. config/.env.{environment} (environment-specific: dev, test, prod)
3. .env file (local development overrides - gitignored)

The same loader as hgs-backend, which took it from sp-company-backend. The
reference's fourth layer, AWS Secrets Manager, is omitted for the same reason
HGS omits it: no AWS account is wired up, so secrets come from the environment.
"""

import json
import os
from pathlib import Path
from typing import Annotated, List, Optional

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Project root: this file lives at src/shared/utils/config.py, hence parent x 4.
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent

#: Minimum SECRET_KEY length outside dev. RFC 7518 section 3.2 requires an HMAC
#: key of at least the hash output size (32 bytes for SHA-256); PyJWT emits an
#: InsecureKeyLengthWarning below it.
MIN_SECRET_KEY_BYTES = 32

#: Environments that may run on the placeholder SECRET_KEY. `test` is here so
#: the suite does not need a real secret; it never serves traffic.
_RELAXED_ENVIRONMENTS = {"dev", "test"}

# Get ENVIRONMENT from the OS first (set on the server, default dev for local).
_environment = os.getenv("ENVIRONMENT", "dev").lower()

# 1. Base config (common to all environments)
_base_config = PROJECT_ROOT / "config" / ".env.base"
if _base_config.exists():
    load_dotenv(_base_config)

# 2. Environment-specific config
_env_config = PROJECT_ROOT / "config" / f".env.{_environment}"
if _env_config.exists():
    load_dotenv(_env_config, override=True)

# 3. Root .env — local developer overrides (gitignored). Highest-priority file
#    so a developer can override any base/env value without editing the shared,
#    committed config files. This is where DATABASE_URL and SECRET_KEY live
#    locally.
#
#    Skipped under `test`: the suite must run against its own SQLite database
#    whatever a developer's .env points at.
_root_env = PROJECT_ROOT / ".env"
if _root_env.exists() and _environment != "test":
    load_dotenv(_root_env, override=True)


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Field names are snake_case; the corresponding env vars are the uppercase
    form (``DATABASE_URL`` -> ``database_url``), matching pydantic-settings'
    case-insensitive lookup.
    """

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Homesprit Backend"
    app_version: str = "1.0.0"
    debug: bool = False
    environment: str = "dev"

    # Server. 8001, not 8000: hgs-backend takes 8000 on the same machine.
    host: str = "127.0.0.1"
    port: int = 8001

    # Database — a dedicated Postgres database. Unlike hgs-backend's, nothing
    # else writes to it.
    database_url: str = "postgresql://postgres:postgres@localhost:5432/homesprit"
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800
    db_statement_timeout_ms: int = 30000

    # Logging
    log_level: str = "INFO"
    log_file: Optional[str] = "logs/app.log"

    # Security / JWT
    # SECRET_KEY signs every access token. Changing it invalidates all
    # outstanding sessions, which is the intended "log everyone out" lever.
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    # A working week. HGS uses a year so its single admin is never signed out
    # mid-edit; Homesprit has several agents on shared office machines, so a
    # shorter session is the better trade. What makes it safe either way is
    # the per-request check: `hasAccess` re-reads the user row, so
    # deactivating an agent takes effect on their next request.
    #
    # The frontend's session cookie takes its max-age from `expires_in` on the
    # login response, so the two can never disagree.
    access_token_expire_minutes: int = 10080

    # CORS — the Next.js site's origin. The browser never calls this service
    # (the frontend proxies server-side), so this matters only for /docs and
    # for anyone pointing a browser client here directly. Credentials are
    # allowed, so it can never be "*".
    #
    # `NoDecode` is required, not decorative: pydantic-settings JSON-decodes
    # List[str] fields from the environment BEFORE validators run, so a bare
    # `CORS_ORIGINS=http://localhost:3002` would fail at import.
    cors_origins: Annotated[List[str], NoDecode] = ["http://localhost:3002"]

    # Initial admin bootstrap (see scripts/setup_admin_service.py).
    # Never hardcode these; they are read from the environment only.
    setup_admin: bool = True
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None
    admin_name: str = "Homesprit Admin"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from a JSON array or a comma-separated string."""
        if isinstance(v, str):
            if v.startswith("["):
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Refuse to start a deployed environment on a weak signing key.

        Two separate failures are caught:

        - The placeholder key, which anyone reading this repo could use to mint
          a valid token.
        - Any key shorter than the HMAC block size (RFC 7518 §3.2).
        """
        environment = os.getenv("ENVIRONMENT", "dev").lower()
        if environment in _RELAXED_ENVIRONMENTS:
            return v

        generate_hint = (
            'Generate one with: python -c "import secrets; '
            'print(secrets.token_urlsafe(48))"'
        )

        if v == "change-me-in-production":
            raise RuntimeError(
                f"SECRET_KEY must be set to a real value outside dev. {generate_hint}"
            )

        if len(v.encode("utf-8")) < MIN_SECRET_KEY_BYTES:
            raise RuntimeError(
                f"SECRET_KEY must be at least {MIN_SECRET_KEY_BYTES} bytes "
                f"(got {len(v.encode('utf-8'))}). RFC 7518 requires this for "
                f"HS256. {generate_hint}"
            )

        return v


# Global settings instance — imported as `from src.shared.utils.config import settings`
settings = Settings()
