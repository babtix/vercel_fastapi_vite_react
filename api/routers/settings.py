"""API endpoints for managing application settings and LLM models.

Handles listing available models from OpenRouter (primary), Ollama, and LM Studio,
reading runtime configuration from MongoDB (with env fallbacks), and persisting
setting changes to the database so they survive serverless cold starts.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from typing import Optional, List
from core.settings import settings
from core.database import settings_collection
from dependencies import get_current_user, get_current_admin_user
from services import lmstudio_service, openrouter_service
from services.openrouter_service import OpenRouterError, OpenRouterKeyMissingError
import ollama

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])

# ---------------------------------------------------------------------------
# Helpers: read / write settings overrides from MongoDB
# ---------------------------------------------------------------------------

_SETTINGS_DOC_ID = "runtime_config"
"""Fixed document ID for the singleton settings override document."""


async def _load_db_settings() -> dict:
    """Load user-persisted settings from MongoDB.

    Returns an empty dict if the document doesn't exist yet.
    """
    try:
        doc = await settings_collection.find_one({"_id": _SETTINGS_DOC_ID})
        if doc:
            doc.pop("_id", None)
            return doc
    except Exception as exc:
        logger.error("Failed to load settings from MongoDB: %s", exc)
    return {}


async def _save_db_settings(data: dict) -> None:
    """Persist settings overrides to MongoDB, upserting the singleton document."""
    try:
        result = await settings_collection.update_one(
            {"_id": _SETTINGS_DOC_ID},
            {"$set": data},
            upsert=True,
        )
        logger.info(
            "MongoDB settings upsert: matched=%s modified=%s upserted_id=%s",
            result.matched_count,
            result.modified_count,
            result.upserted_id,
        )
    except Exception as exc:
        logger.error("Failed to save settings to MongoDB: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Échec de l'écriture en base de données : {exc}",
        ) from exc


def _apply_to_runtime(data: dict) -> None:
    """Push updated keys into the in-memory settings singleton."""
    for key, value in data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)


def _merge_settings() -> dict:
    """Merge environment defaults with MongoDB overrides.

    Returns a flat dict with all current effective settings.
    """
    import asyncio
    try:
        db_overrides = asyncio.get_event_loop().run_until_complete(_load_db_settings())
    except Exception:
        db_overrides = {}

    merged = {}
    keys = [
        "OPENROUTER_API_KEY",
        "OPENROUTER_BASE_URL",
        "DEFAULT_LLM_PROVIDER",
        "DEFAULT_MODEL_NAME",
        "OLLAMA_URL",
        "OLLAMA_TIMEOUT",
        "MODEL_TEMPERATURE",
        "MODEL_TOP_P",
        "MODEL_TOP_K",
        "MODEL_REPEAT_PENALTY",
        "MODEL_NUM_PREDICT",
        "MODEL_NUM_CTX",
    ]
    for key in keys:
        db_val = db_overrides.get(key)
        env_val = getattr(settings, key, None)
        merged[key] = db_val if db_val is not None else env_val
    return merged


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ModelInfo(BaseModel):
    """Schema representing metadata for a single LLM model."""

    name: str
    size: int
    size_gb: float
    provider: str
    is_cloud: bool
    is_free: bool = False
    context_length: int = 0
    description: str = ""


class ModelsResponse(BaseModel):
    """Schema wrapping a list of ModelInfo objects."""

    models: List[ModelInfo]


class SettingsData(BaseModel):
    """Read-only schema exposing current runtime configuration values."""

    OPENROUTER_API_KEY: str
    OPENROUTER_BASE_URL: str
    DEFAULT_LLM_PROVIDER: str
    DEFAULT_MODEL_NAME: str
    OLLAMA_URL: str
    OLLAMA_TIMEOUT: float
    MODEL_TEMPERATURE: float
    MODEL_TOP_P: float
    MODEL_TOP_K: int
    MODEL_REPEAT_PENALTY: float
    MODEL_NUM_PREDICT: int
    MODEL_NUM_CTX: int


class SettingsUpdate(BaseModel):
    """Partial-update schema for mutable application settings."""

    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: Optional[str] = None
    DEFAULT_LLM_PROVIDER: Optional[str] = None
    DEFAULT_MODEL_NAME: Optional[str] = None
    OLLAMA_URL: Optional[str] = None
    OLLAMA_TIMEOUT: Optional[float] = None
    MODEL_TEMPERATURE: Optional[float] = None
    MODEL_TOP_P: Optional[float] = None
    MODEL_TOP_K: Optional[int] = None
    MODEL_REPEAT_PENALTY: Optional[float] = None
    MODEL_NUM_PREDICT: Optional[int] = None
    MODEL_NUM_CTX: Optional[int] = None

    @field_validator("MODEL_TEMPERATURE")
    @classmethod
    def validate_temperature(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0 <= v <= 2):
            raise ValueError("Temperature must be between 0 and 2")
        return v

    @field_validator("MODEL_TOP_P")
    @classmethod
    def validate_top_p(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not (0 <= v <= 1):
            raise ValueError("Top_p must be between 0 and 1")
        return v

    @field_validator("MODEL_TOP_K")
    @classmethod
    def validate_top_k(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("Top_k must be at least 1")
        return v

    @field_validator("MODEL_REPEAT_PENALTY")
    @classmethod
    def validate_repeat_penalty(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Repeat_penalty must be greater than 0")
        return v

    @field_validator("MODEL_NUM_PREDICT")
    @classmethod
    def validate_num_predict(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("Num_predict must be at least 1")
        return v

    @field_validator("MODEL_NUM_CTX")
    @classmethod
    def validate_num_ctx(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 512:
            raise ValueError("Num_ctx must be at least 512")
        return v

    @field_validator("OLLAMA_TIMEOUT")
    @classmethod
    def validate_timeout(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Timeout must be greater than 0")
        return v

    @field_validator("DEFAULT_LLM_PROVIDER")
    @classmethod
    def validate_provider(cls, v: Optional[str]) -> Optional[str]:
        allowed = {"openrouter", "ollama", "lmstudio"}
        if v is not None and v.lower() not in allowed:
            raise ValueError(f"Provider must be one of: {', '.join(allowed)}")
        return v.lower() if v else v


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/models",
    response_model=ModelsResponse,
    status_code=status.HTTP_200_OK,
)
async def list_available_models(
    current_user: dict = Depends(get_current_user),
):
    """List all available LLM models.

    Loads the OpenRouter API key directly from MongoDB so it works
    reliably across serverless cold starts.
    """
    models = []

    # Load API key directly from DB — never rely on the in-memory singleton
    db_settings = await _load_db_settings()
    or_api_key = db_settings.get("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY

    # Fetch OpenRouter models (primary cloud provider)
    try:
        or_models = await openrouter_service.list_models(api_key=or_api_key)
        for m in or_models:
            models.append(
                ModelInfo(
                    name=m["name"],
                    size=m["size"],
                    size_gb=m["size_gb"],
                    provider=m["provider"],
                    is_cloud=m["is_cloud"],
                    is_free=m.get("is_free", False),
                    context_length=m.get("context_length", 0),
                    description=m.get("description", ""),
                )
            )
    except OpenRouterKeyMissingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except OpenRouterError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    except Exception as e:
        logger.error("Error fetching OpenRouter models: %s", e)

    # Fetch Ollama models (legacy local provider)
    try:
        client = ollama.AsyncClient(
            host=settings.OLLAMA_URL, timeout=settings.OLLAMA_TIMEOUT
        )
        ollama_response = await client.list()
        for model in ollama_response.models:
            name = model.model or ""
            size_bytes = model.size or 0
            size_gb = round(size_bytes / (1024**3), 2) if size_bytes else 0
            models.append(
                ModelInfo(
                    name=name,
                    size=size_bytes,
                    size_gb=size_gb,
                    provider="ollama",
                    is_cloud="cloud" in name.lower(),
                    is_free=True,
                )
            )
    except Exception as e:
        logger.error("Error fetching Ollama models: %s", e)

    # Fetch LM Studio models (legacy local provider)
    try:
        lms_models = await lmstudio_service.list_models()
        for m in lms_models:
            models.append(
                ModelInfo(
                    name=m["name"],
                    size=m["size"],
                    size_gb=m["size_gb"],
                    provider=m["provider"],
                    is_cloud=m["is_cloud"],
                    is_free=True,
                )
            )
    except Exception as e:
        logger.error("Error fetching LM Studio models: %s", e)

    # Sort: OpenRouter first, then cloud, then local, then alphabetical
    def sort_key(m: ModelInfo):
        provider_order = {"openrouter": 0, "ollama": 1, "lmstudio": 2}
        return (provider_order.get(m.provider, 9), not m.is_cloud, m.name)

    models.sort(key=sort_key)
    return ModelsResponse(models=models)


@router.get("/", response_model=SettingsData, status_code=status.HTTP_200_OK)
async def get_settings(
    current_user: dict = Depends(get_current_admin_user),
):
    """Return the current runtime application settings.

    Values are merged from environment defaults + MongoDB overrides.
    """
    db_overrides = await _load_db_settings()

    def _val(key: str, default):
        v = db_overrides.get(key)
        return v if v is not None else default

    return SettingsData(
        OPENROUTER_API_KEY=_val("OPENROUTER_API_KEY", settings.OPENROUTER_API_KEY),
        OPENROUTER_BASE_URL=_val("OPENROUTER_BASE_URL", settings.OPENROUTER_BASE_URL),
        DEFAULT_LLM_PROVIDER=_val("DEFAULT_LLM_PROVIDER", settings.DEFAULT_LLM_PROVIDER),
        DEFAULT_MODEL_NAME=_val("DEFAULT_MODEL_NAME", settings.DEFAULT_MODEL_NAME),
        OLLAMA_URL=_val("OLLAMA_URL", settings.OLLAMA_URL),
        OLLAMA_TIMEOUT=_val("OLLAMA_TIMEOUT", settings.OLLAMA_TIMEOUT),
        MODEL_TEMPERATURE=_val("MODEL_TEMPERATURE", settings.MODEL_TEMPERATURE),
        MODEL_TOP_P=_val("MODEL_TOP_P", settings.MODEL_TOP_P),
        MODEL_TOP_K=_val("MODEL_TOP_K", settings.MODEL_TOP_K),
        MODEL_REPEAT_PENALTY=_val("MODEL_REPEAT_PENALTY", settings.MODEL_REPEAT_PENALTY),
        MODEL_NUM_PREDICT=_val("MODEL_NUM_PREDICT", settings.MODEL_NUM_PREDICT),
        MODEL_NUM_CTX=_val("MODEL_NUM_CTX", settings.MODEL_NUM_CTX),
    )


@router.put("/", response_model=SettingsData, status_code=status.HTTP_200_OK)
async def update_settings(
    update_data: SettingsUpdate,
    current_user: dict = Depends(get_current_admin_user),
):
    """Update application settings and persist them to MongoDB."""
    data = update_data.model_dump(exclude_unset=True)
    logger.info("Received settings update for keys: %s", list(data.keys()))

    # Save to MongoDB so the values survive serverless cold starts
    await _save_db_settings(data)

    # Verify the write actually landed in MongoDB
    loaded = await _load_db_settings()
    logger.info("DB settings after write: %s", {k: "***" if "KEY" in k else v for k, v in loaded.items()})

    for key, expected in data.items():
        actual = loaded.get(key)
        if actual != expected:
            logger.error(
                "Settings persistence verification failed for %s: expected=%r, actual=%r",
                key, expected, actual,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"La sauvegarde de {key} a échoué. Veuillez réessayer.",
            )

    # Update in-memory singleton so the current instance uses them immediately
    _apply_to_runtime(data)
    logger.info("Settings updated and persisted successfully: %s", list(data.keys()))

    # Return merged view
    return await get_settings(current_user)


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
)
async def settings_status(
    current_user: dict = Depends(get_current_user),
):
    """Debug endpoint showing whether the OpenRouter key is persisted.

    Returns a masked view of the API key so admins can verify persistence
    without exposing the full secret.
    """
    db_overrides = await _load_db_settings()
    key = db_overrides.get("OPENROUTER_API_KEY") or settings.OPENROUTER_API_KEY

    masked = ""
    if key:
        if len(key) > 12:
            masked = key[:6] + "..." + key[-6:]
        else:
            masked = "***"

    return {
        "api_key_configured": bool(key),
        "api_key_masked": masked,
        "default_model": db_overrides.get("DEFAULT_MODEL_NAME") or settings.DEFAULT_MODEL_NAME,
        "default_provider": db_overrides.get("DEFAULT_LLM_PROVIDER") or settings.DEFAULT_LLM_PROVIDER,
        "db_document_exists": "OPENROUTER_API_KEY" in db_overrides,
        "db_keys_count": len(db_overrides),
    }
