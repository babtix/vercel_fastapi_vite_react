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
    doc = await settings_collection.find_one({"_id": _SETTINGS_DOC_ID})
    if doc:
        # Strip MongoDB internals
        doc.pop("_id", None)
        return doc
    return {}


async def _save_db_settings(data: dict) -> None:
    """Persist settings overrides to MongoDB, upserting the singleton document."""
    await settings_collection.update_one(
        {"_id": _SETTINGS_DOC_ID},
        {"$set": data},
        upsert=True,
    )


def _apply_to_runtime(data: dict) -> None:
    """Push updated keys into the in-memory settings singleton.

    This ensures that services like OpenRouter see the new API key
    immediately without waiting for the next cold start.
    """
    for key, value in data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ModelInfo(BaseModel):
    """Schema representing metadata for a single LLM model.

    Attributes:
        name: Model identifier.
        size: Size in bytes (0 for cloud models).
        size_gb: Size in gigabytes (0.0 for cloud models).
        provider: Origin provider — \"openrouter\", \"ollama\", or \"lmstudio\".
        is_cloud: Whether the model is a cloud endpoint.
        is_free: Whether the model is free to use.
        context_length: Context window size (OpenRouter models).
        description: Short model description (OpenRouter models).
    """

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
    """Partial-update schema for mutable application settings.

    All fields are optional; only provided values are updated and persisted.
    """

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
        """Ensure temperature is between 0 and 2 inclusive."""
        if v is not None and not (0 <= v <= 2):
            raise ValueError("Temperature must be between 0 and 2")
        return v

    @field_validator("MODEL_TOP_P")
    @classmethod
    def validate_top_p(cls, v: Optional[float]) -> Optional[float]:
        """Ensure top_p is between 0 and 1 inclusive."""
        if v is not None and not (0 <= v <= 1):
            raise ValueError("Top_p must be between 0 and 1")
        return v

    @field_validator("MODEL_TOP_K")
    @classmethod
    def validate_top_k(cls, v: Optional[int]) -> Optional[int]:
        """Ensure top_k is at least 1."""
        if v is not None and v < 1:
            raise ValueError("Top_k must be at least 1")
        return v

    @field_validator("MODEL_REPEAT_PENALTY")
    @classmethod
    def validate_repeat_penalty(cls, v: Optional[float]) -> Optional[float]:
        """Ensure repeat penalty is greater than 0."""
        if v is not None and v <= 0:
            raise ValueError("Repeat_penalty must be greater than 0")
        return v

    @field_validator("MODEL_NUM_PREDICT")
    @classmethod
    def validate_num_predict(cls, v: Optional[int]) -> Optional[int]:
        """Ensure num_predict is at least 1."""
        if v is not None and v < 1:
            raise ValueError("Num_predict must be at least 1")
        return v

    @field_validator("MODEL_NUM_CTX")
    @classmethod
    def validate_num_ctx(cls, v: Optional[int]) -> Optional[int]:
        """Ensure context window size is at least 512."""
        if v is not None and v < 512:
            raise ValueError("Num_ctx must be at least 512")
        return v

    @field_validator("OLLAMA_TIMEOUT")
    @classmethod
    def validate_timeout(cls, v: Optional[float]) -> Optional[float]:
        """Ensure timeout is strictly positive."""
        if v is not None and v <= 0:
            raise ValueError("Timeout must be greater than 0")
        return v

    @field_validator("DEFAULT_LLM_PROVIDER")
    @classmethod
    def validate_provider(cls, v: Optional[str]) -> Optional[str]:
        """Ensure provider is one of the supported values."""
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
    """List all available LLM models from OpenRouter (primary), Ollama, and LM Studio.

    Args:
        current_user: Injected authenticated user dependency.

    Returns:
        A ModelsResponse containing aggregated model metadata, sorted with cloud models first.
    """
    models = []

    # Fetch OpenRouter models (primary cloud provider)
    try:
        or_models = await openrouter_service.list_models()
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

    Args:
        current_user: Injected admin user dependency.

    Returns:
        A SettingsData object with the active configuration values.
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
    """Update application settings and persist them to MongoDB.

    Args:
        update_data: Partial settings payload; only provided fields are updated.
        current_user: Injected admin user dependency.

    Returns:
        The updated SettingsData reflecting the new runtime values.
    """
    data = update_data.model_dump(exclude_unset=True)

    # Save to MongoDB so the values survive serverless cold starts
    await _save_db_settings(data)

    # Update in-memory singleton so the current instance uses them immediately
    _apply_to_runtime(data)

    # Return merged view
    return await get_settings(current_user)
