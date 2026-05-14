"""Application configuration settings.

Loads environment variables from a `.env` file and provides sensible
defaults for MongoDB, security, LLM providers, RAG, and CORS settings.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    """Centralized application settings loaded from environment variables.

    Attributes:
        PROJECT_NAME: Human-readable project identifier.
        MONGODB_URL: Connection string for the MongoDB instance.
        DATABASE_NAME: Name of the MongoDB database to use.
        SECRET_KEY: Secret key used for signing JWT tokens (required).
        ALGORITHM: JWT signing algorithm (default HS256).
        ACCESS_TOKEN_EXPIRE_MINUTES: Lifetime of access tokens in minutes.
        DEFAULT_LLM_PROVIDER: Default provider — "openrouter", "ollama", or "lmstudio".
        OLLAMA_URL: Base URL for the Ollama API.
        OLLAMA_TIMEOUT: Request timeout for Ollama calls in seconds.
        DEFAULT_MODEL_NAME: Default LLM model identifier.
        LMSTUDIO_BASE_URL: Base URL for the LM Studio API.
        LMSTUDIO_DEFAULT_MODEL: Fallback model name for LM Studio.
        MODEL_TEMPERATURE: Sampling temperature for LLM generation.
        MODEL_TOP_P: Nucleus sampling parameter.
        MODEL_TOP_K: Top-k sampling parameter.
        MODEL_REPEAT_PENALTY: Penalty for repeated tokens.
        MODEL_NUM_PREDICT: Maximum tokens to predict.
        MODEL_NUM_CTX: Context window size.
        MODEL_SEED: Optional random seed for reproducibility.
        MODEL_STOP: List of stop sequences.
        RAG_EMBEDDING_MODEL: Model used for RAG embeddings.
        RAG_CHUNK_SIZE: Size of each document chunk.
        RAG_CHUNK_OVERLAP: Overlap between consecutive chunks.
        RAG_TOP_K: Number of top chunks to retrieve.
        RAG_MIN_SCORE: Minimum similarity score for retrieved chunks.
        N8N_WEBHOOK_URL: n8n webhook endpoint for research tasks.
        DEBUG: Enable FastAPI debug mode.
        CORS_ORIGINS: Allowed origins for cross-origin requests.
    """

    PROJECT_NAME: str = "Multi-IA Consultant"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "multiia_db"

    # Security settings
    SECRET_KEY: str = "super-secret-key-minimum-32-characters-default-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # LLM Provider settings
    DEFAULT_LLM_PROVIDER: str = "openrouter"  # "openrouter", "ollama", or "lmstudio"

    # OpenRouter settings
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Ollama settings (legacy / local fallback)
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_TIMEOUT: float = 120.0
    DEFAULT_MODEL_NAME: str = "openai/gpt-4o-mini"

    # LM Studio settings (legacy / local fallback)
    LMSTUDIO_BASE_URL: str = "http://localhost:1234"
    LMSTUDIO_DEFAULT_MODEL: str = "loaded-model"

    # Model Parameters
    MODEL_TEMPERATURE: float = 0.7
    MODEL_TOP_P: float = 0.9
    MODEL_TOP_K: int = 40
    MODEL_REPEAT_PENALTY: float = 1.1
    MODEL_NUM_PREDICT: int = 1024
    MODEL_NUM_CTX: int = 4096
    MODEL_SEED: int | None = None
    MODEL_STOP: list[str] = []

    # RAG settings
    # sentence-transformers model (local, no Ollama required)
    RAG_EMBEDDING_MODEL: str = "paraphrase-multilingual-MiniLM-L12-v2"
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 50
    RAG_TOP_K: int = 5
    RAG_MIN_SCORE: float = 0.4

    # n8n Research settings
    N8N_WEBHOOK_URL: str = "http://127.0.0.1:5678/webhook-test/smart-researcher"

    DEBUG: bool = False
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8008",
    ]

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from a comma-separated string into a list of strings."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES")
    @classmethod
    def validate_token_expiry(cls, v: int) -> int:
        """Ensure the access token expiry is a positive integer."""
        if v <= 0:
            raise ValueError("ACCESS_TOKEN_EXPIRE_MINUTES must be greater than 0")
        return v


settings = Settings()
