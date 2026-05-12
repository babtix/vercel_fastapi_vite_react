"""Pydantic data models for Conversations and Messages.

This module defines the structure for chat history, individual messages,
and conversation metadata. It includes validators to enforce data integrity
for roles and titles.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import List
from datetime import datetime, timezone


class Message(BaseModel):
    """Schema representing a single chat message within a conversation.

    Attributes:
        role: Sender type — must be "user", "assistant", or "system".
        content: Text payload of the message.
        timestamp: UTC datetime when the message was created.
    """

    role: str
    content: str
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate that the message role is one of the allowed values."""
        v = v.lower().strip()
        if v not in {"user", "assistant", "system"}:
            raise ValueError(
                'Role must be "user", "assistant", or "system"'
            )
        return v


class ConversationBase(BaseModel):
    """Base schema containing shared conversation fields.

    Attributes:
        title: Human-readable conversation title (1-200 characters).
        agent_id: Identifier of the agent associated with this conversation.
    """

    title: str
    agent_id: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate that the conversation title is non-empty and at most 200 characters."""
        v = v.strip()
        if not v:
            raise ValueError("Title must be at least 1 character long")
        if len(v) > 200:
            raise ValueError("Title must be at most 200 characters long")
        return v


class ConversationCreate(ConversationBase):
    """Schema used when creating a new conversation.

    Inherits all fields from ConversationBase without additional restrictions.
    """

    pass


class ConversationResponse(ConversationBase):
    """Schema returned when retrieving a conversation from the database.

    Attributes:
        id: MongoDB document ObjectId serialized as a string (alias `_id`).
        user_id: Identifier of the owning user.
        messages: Ordered list of messages in the conversation.
        created_at: UTC datetime when the conversation was created.
        updated_at: UTC datetime of the last update.
    """

    id: str = Field(alias="_id")
    user_id: str
    messages: List[Message] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
