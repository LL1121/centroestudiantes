from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def build_database_url(
    *,
    user: str,
    password: str,
    host: str,
    port: int = 5432,
    database: str,
) -> str:
    """URL asyncpg con password escapado (soporta caracteres especiales)."""
    safe_password = quote_plus(password, safe="")
    return (
        f"postgresql+asyncpg://{user}:{safe_password}@{host}:{port}/{database}"
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_debug: bool = True
    app_host: str = "0.0.0.0"
    app_port: int = 8000

    # Conexión explícita (desarrollo local). En Docker preferí POSTGRES_*.
    database_url: str | None = None

    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_host: str | None = None
    postgres_port: int = 5432
    postgres_db: str = "centro"

    jwt_secret: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14

    cors_origins: str = "http://localhost:3000"

    storage_backend: str = "local"
    storage_root: Path = Path("./var/storage")

    embedding_dim: int = 1536
    embedding_backend: str = "fake"
    embedding_model: str = "text-embedding-3-small"
    openai_api_key: str | None = None

    chunk_size: int = 1000
    chunk_overlap: int = 200

    ocr_langs: str = "spa+eng"
    ocr_max_pages: int = 50
    ocr_min_native_chars: int = 200
    ocr_dpi: int = 200
    fuzzy_threshold: float = 0.2

    # LLM (Etapa 4)
    llm_backend: str = "fake"        # fake | openai | groq | gemini
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 1200
    llm_top_k: int = 5
    groq_api_key: str | None = None
    gemini_api_key: str | None = None
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai"

    # Límite de consultas al asistente (por usuario autenticado).
    # En free tier de Gemini conviene ser conservadores (p. ej. 30/day).
    chat_rate_limit: str = "30/day"

    # Moderación de contenido (OpenAI omni-moderation)
    moderation_enabled: bool = True
    moderation_max_pages: int = 20
    moderation_text_threshold: float = 0.5
    moderation_image_threshold: float = 0.5
    moderation_domain_blocklist: str = "pornhub.com,xvideos.com,redtube.com"

    # Email (verificación y reset; opcional si SMTP_HOST vacío)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str | None = None
    smtp_use_tls: bool = True
    public_app_url: str = "http://localhost:3000"
    email_verify_expire_hours: int = 24
    password_reset_expire_hours: int = 2
    require_email_verified: bool = False
    twofa_challenge_expire_minutes: int = 5
    twofa_email_otp_expire_minutes: int = 10

    # Antivirus (ClamAV)
    antivirus_enabled: bool = False
    clamav_host: str = "clamav"
    clamav_port: int = 3310
    upload_max_bytes: int = 52_428_800  # 50 MB

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def moderation_blocklist_domains(self) -> list[str]:
        return [d.strip().lower() for d in self.moderation_domain_blocklist.split(",") if d.strip()]

    @model_validator(mode="after")
    def resolve_database_url(self) -> Settings:
        """En Docker (POSTGRES_HOST) arma la URL desde POSTGRES_*."""
        host = self.postgres_host or os.getenv("POSTGRES_HOST")
        if host:
            user = os.getenv("POSTGRES_USER", self.postgres_user)
            password = os.getenv("POSTGRES_PASSWORD", self.postgres_password)
            database = os.getenv("POSTGRES_DB", self.postgres_db)
            port = int(os.getenv("POSTGRES_PORT", str(self.postgres_port)))
            object.__setattr__(
                self,
                "database_url",
                build_database_url(
                    user=user,
                    password=password,
                    host=host,
                    port=port,
                    database=database,
                ),
            )
            return self

        if not self.database_url:
            object.__setattr__(
                self,
                "database_url",
                build_database_url(
                    user=self.postgres_user,
                    password=self.postgres_password,
                    host="localhost",
                    port=self.postgres_port,
                    database=self.postgres_db,
                ),
            )
        return self

    @property
    def resolved_database_url(self) -> str:
        assert self.database_url is not None
        return self.database_url

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
