"""API endpoints for managing application settings and LLM models.

Handles listing available models from Ollama and LM Studio, reading
runtime configuration, and persisting setting changes to the `.env` file.
"""

import os
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, field_validator
from typing import Optional, List
from core.settings import settings
from dependencies import get_current_admin_user
from services import lmstudio_service
import ollama

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])


class ModelInfo(BaseModel):
    """Schema representing metadata for a single downloadable or loaded LLM.

    Attributes:
        name: Model identifier or filename.
        size: Size in bytes.
        size_gb: Size in gigabytes (rounded to 2 decimals).
        provider: Origin provider — "ollama" or "lmstudio".
        is_cloud: Whether the model is tagged as a cloud endpoint.
    """

    name: str
    size: int
    size_gb: float
    provider: str
    is_cloud: bool


class ModelsResponse(BaseModel):
    """Schema wrapping a list of ModelInfo objects."""

    models: List[ModelInfo]


class SettingsData(BaseModel):
    """Read-only schema exposing current runtime configuration values."""

    OLLAMA_URL: str
    OLLAMA_TIMEOUT: float
    DEFAULT_MODEL_NAME: str
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

    OLLAMA_URL: Optional[str] = None
    OLLAMA_TIMEOUT: Optional[float] = None
    DEFAULT_MODEL_NAME: Optional[str] = None
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


@router.get(
    "/models",
    response_model=ModelsResponse,
    status_code=status.HTTP_200_OK,
)
async def list_available_models(
    current_user: dict = Depends(get_current_admin_user),
):
    """List all available LLM models from Ollama and LM Studio.

    Args:
        current_user: Injected admin user dependency.

    Returns:
        A ModelsResponse containing aggregated model metadata.
    """
    models = []

    # Fetch Ollama models
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
                )
            )
    except Exception as e:
        logger.error("Error fetching Ollama models: %s", e)

    # Fetch LM Studio models
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
                )
            )
    except Exception as e:
        logger.error("Error fetching LM Studio models: %s", e)

    # Sort cloud models first
    models.sort(key=lambda m: (not m.is_cloud, m.name))
    return ModelsResponse(models=models)


@router.get("/", response_model=SettingsData, status_code=status.HTTP_200_OK)
async def get_settings(
    current_user: dict = Depends(get_current_admin_user),
):
    """Return the current runtime application settings.

    Args:
        current_user: Injected admin user dependency.

    Returns:
        A SettingsData object with the active configuration values.
    """
    return SettingsData(
        OLLAMA_URL=settings.OLLAMA_URL,
        OLLAMA_TIMEOUT=settings.OLLAMA_TIMEOUT,
        DEFAULT_MODEL_NAME=settings.DEFAULT_MODEL_NAME,
        MODEL_TEMPERATURE=settings.MODEL_TEMPERATURE,
        MODEL_TOP_P=settings.MODEL_TOP_P,
        MODEL_TOP_K=settings.MODEL_TOP_K,
        MODEL_REPEAT_PENALTY=settings.MODEL_REPEAT_PENALTY,
        MODEL_NUM_PREDICT=settings.MODEL_NUM_PREDICT,
        MODEL_NUM_CTX=settings.MODEL_NUM_CTX,
    )


def _persist_env(data: dict) -> None:
    """Persist updated settings to the `.env` file on disk.

    Args:
        data: Dictionary of setting keys and their new values.
    """
    env_lines: list[str] = []
    if os.path.exists(".env"):
        with open(".env", "r", encoding="utf-8") as f:
            env_lines = f.readlines()

    env_keys: dict[str, int] = {}
    for i, line in enumerate(env_lines):
        if "=" in line and not line.strip().startswith("#"):
            k = line.split("=")[0].strip()
            env_keys[k] = i

    for key, value in data.items():
        safe_value = str(value).replace("\n", "").replace("\r", "")
        if key in env_keys:
            env_lines[env_keys[key]] = f"{key}={safe_value}\n"
        else:
            env_lines.append(f"{key}={safe_value}\n")

    with open(".env", "w", encoding="utf-8") as f:
        f.writelines(env_lines)


@router.put("/", response_model=SettingsData, status_code=status.HTTP_200_OK)
async def update_settings(
    update_data: SettingsUpdate,
    current_user: dict = Depends(get_current_admin_user),
):
    """Update application settings and persist them to disk.

    Args:
        update_data: Partial settings payload; only provided fields are updated.
        current_user: Injected admin user dependency.

    Returns:
        The updated SettingsData reflecting the new runtime values.
    """
    data = update_data.model_dump(exclude_unset=True)

    for key, value in data.items():
        setattr(settings, key, value)

    # Save to .env in background thread
    await run_in_threadpool(_persist_env, data)

    return SettingsData(
        OLLAMA_URL=settings.OLLAMA_URL,
        OLLAMA_TIMEOUT=settings.OLLAMA_TIMEOUT,
        DEFAULT_MODEL_NAME=settings.DEFAULT_MODEL_NAME,
        MODEL_TEMPERATURE=settings.MODEL_TEMPERATURE,
        MODEL_TOP_P=settings.MODEL_TOP_P,
        MODEL_TOP_K=settings.MODEL_TOP_K,
        MODEL_REPEAT_PENALTY=settings.MODEL_REPEAT_PENALTY,
        MODEL_NUM_PREDICT=settings.MODEL_NUM_PREDICT,
        MODEL_NUM_CTX=settings.MODEL_NUM_CTX,
    )
