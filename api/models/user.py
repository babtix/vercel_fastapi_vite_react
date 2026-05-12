"""Pydantic data models for User accounts and authentication.

This module defines schemas for user registration, public user responses,
internal database representation (including hashed passwords), and
OAuth2 bearer token payloads.
"""

import re
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict


class UserCreate(BaseModel):
    """Schema used when registering a new user account.

    Attributes:
        email: Valid email address used for login and communications.
        username: Unique display name (3+ chars, alphanumeric and underscores).
        password: Plain-text password subject to complexity rules.
    """

    email: EmailStr
    username: str
    password: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize the email address to lowercase and strip whitespace."""
        return v.lower().strip()

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate that the username is at least 3 characters and only contains allowed characters."""
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters long")
        if not re.match(r"^[a-zA-Z0-9_]+$", v):
            raise ValueError(
                "Username can only contain letters, numbers, and underscores"
            )
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password complexity: minimum 8 chars, uppercase, digit, and special character."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError(
                "Password must contain at least one uppercase letter"
            )
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError(
                "Password must contain at least one special character"
            )
        return v


class UserResponse(BaseModel):
    """Schema returned when exposing user data via API endpoints.

    Attributes:
        id: MongoDB document ObjectId serialized as a string (alias `_id`).
        email: User's normalized email address.
        username: User's chosen display name.
        is_admin: Flag indicating whether the user has administrative privileges.
    """

    id: str = Field(alias="_id")
    email: EmailStr
    username: str
    is_admin: bool = False

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class UserInDB(UserResponse):
    """Internal schema extending UserResponse with the hashed password.

    This model should never be returned to clients; it is used strictly
    for authentication and database operations.

    Attributes:
        hashed_password: Bcrypt-hashed password stored in MongoDB.
    """

    hashed_password: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Token(BaseModel):
    """Schema representing an OAuth2 Bearer token response.

    Attributes:
        access_token: Signed JWT access token.
        token_type: Token type, typically "bearer".
    """

    access_token: str
    token_type: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
