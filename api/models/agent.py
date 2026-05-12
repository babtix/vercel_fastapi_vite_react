"""Pydantic data models for Agent entities.

This module defines the structure and validation rules for creating,
updating, and retrieving AI agent configurations. Agents represent
specialized LLM personas with custom system prompts, model selections,
and optional RAG capabilities.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from core.settings import settings
from typing import Optional


class AgentBase(BaseModel):
    """Base schema containing shared agent fields and validation logic.

    Attributes:
        name: Display name of the agent (1-100 characters).
        description: Short summary of the agent's purpose.
        system_prompt: System-level instructions sent to the LLM.
        model_name: Target LLM model identifier (default from settings).
        provider: Backend LLM provider, either "ollama" or "lmstudio".
        logo_url: Optional URL to an agent logo image.
        rag_enabled: Whether Retrieval-Augmented Generation is enabled.
    """

    name: str
    description: str
    system_prompt: str
    model_name: str = settings.DEFAULT_MODEL_NAME
    provider: str = settings.DEFAULT_LLM_PROVIDER
    logo_url: Optional[str] = None
    rag_enabled: bool = False

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate that the agent name is non-empty and at most 100 characters."""
        v = v.strip()
        if not v:
            raise ValueError("Name must be at least 1 character long")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters long")
        return v

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        """Validate that the LLM provider is either 'ollama' or 'lmstudio'."""
        v = v.lower().strip()
        if v not in {"ollama", "lmstudio"}:
            raise ValueError('Provider must be "ollama" or "lmstudio"')
        return v


class AgentCreate(AgentBase):
    """Schema used when creating a new agent.

    Inherits all fields from AgentBase without additional restrictions.
    """

    pass


class AgentResponse(AgentBase):
    """Schema returned when retrieving an agent from the database.

    Attributes:
        id: MongoDB document ObjectId serialized as a string (alias `_id`).
    """

    id: str = Field(alias="_id")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AgentDeleteResponse(BaseModel):
    """Schema returned after a successful agent deletion.

    Attributes:
        status: Human-readable result of the operation (e.g., "deleted").
        deleted_id: Identifier of the removed agent.
    """

    status: str
    deleted_id: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
