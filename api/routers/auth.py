"""Authentication and user management endpoints.

Handles user registration, login, profile updates, password changes,
and administrative user management (list, delete, promote, demote).
"""

import re
from datetime import timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, field_validator
from bson import ObjectId

from core.database import users_collection
from core.security import get_password_hash, verify_password, create_access_token
from core.settings import settings
from core.rate_limit import limiter
from models.user import UserCreate, UserResponse, Token
from dependencies import get_current_user, get_current_admin_user


class PasswordChange(BaseModel):
    """Schema for changing an existing user's password.

    Attributes:
        current_password: The user's existing password for verification.
        new_password: The desired new password (must meet complexity rules).
    """

    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate that the new password meets complexity requirements."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError(
                "Password must contain at least one uppercase letter"
            )
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\"{}|<>]", v):
            raise ValueError(
                "Password must contain at least one special character"
            )
        return v


class ProfileUpdate(BaseModel):
    """Schema for updating a user's public profile information.

    Attributes:
        username: Optional new username (3+ chars, alphanumeric/underscores).
        email: Optional new email address.
    """

    username: str | None = None
    email: EmailStr | None = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str | None) -> str | None:
        """Validate username format if a value is provided."""
        if v is not None:
            if len(v) < 3:
                raise ValueError("Username must be at least 3 characters long")
            if not re.match(r"^[a-zA-Z0-9_]+$", v):
                raise ValueError(
                    "Username can only contain letters, numbers, and underscores"
                )
        return v

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v: str | None) -> str | None:
        """Normalize the email to lowercase and strip whitespace if provided."""
        if v is not None:
            return v.lower().strip()
        return v


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
@limiter.limit("3/minute")
async def register(request: Request, user: UserCreate):
    """Register a new user account.

    Args:
        request: Incoming HTTP request (required by rate limiter).
        user: User creation payload containing email, username, and password.

    Returns:
        The newly created user serialized as a UserResponse.

    Raises:
        HTTPException: 400 if the email or username is already taken.
    """
    existing_user = await users_collection.find_one(
        {"$or": [{"email": user.email}, {"username": user.username}]}
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'email ou le nom d'utilisateur est déjà utilisé",
        )

    user_dict = user.model_dump()
    user_dict["is_admin"] = False
    user_dict["hashed_password"] = get_password_hash(
        user_dict.pop("password")
    )

    result = await users_collection.insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)

    return user_dict


@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """Authenticate a user and return a JWT access token.

    Args:
        request: Incoming HTTP request (required by rate limiter).
        form_data: OAuth2 password request form containing username and password.

    Returns:
        A Token object containing the signed JWT access token.

    Raises:
        HTTPException: 401 if credentials are invalid.
    """
    user = await users_collection.find_one(
        {"username": form_data.username}
    )
    if not user:
        # fallback to email login
        user = await users_collection.find_one(
            {"email": form_data.username}
        )

    if not user or not verify_password(
        form_data.password, user["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=access_token_expires,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve the currently authenticated user's profile.

    Args:
        current_user: Injected authenticated user dictionary.

    Returns:
        The current user's profile data.
    """
    return current_user


@router.put("/me/password", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    data: PasswordChange,
    current_user: dict = Depends(get_current_user),
):
    """Change the authenticated user's password.

    Args:
        request: Incoming HTTP request (required by rate limiter).
        data: PasswordChange payload with current and new passwords.
        current_user: Injected authenticated user dictionary.

    Returns:
        A success status message.

    Raises:
        HTTPException: 400 if the user ID is invalid or current password is wrong.
    """
    if not ObjectId.is_valid(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID utilisateur invalide",
        )

    user = await users_collection.find_one(
        {"_id": ObjectId(current_user["_id"])}
    )
    if not user or not verify_password(
        data.current_password, user["hashed_password"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mot de passe actuel incorrect",
        )

    new_hash = get_password_hash(data.new_password)
    await users_collection.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": {"hashed_password": new_hash}},
    )
    return {"status": "success", "message": "Mot de passe modifié avec succès"}


@router.put("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def update_profile(
    data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update the authenticated user's profile information.

    Args:
        data: ProfileUpdate payload with optional new username and/or email.
        current_user: Injected authenticated user dictionary.

    Returns:
        The updated user profile serialized as a UserResponse.

    Raises:
        HTTPException: 400 if the user ID is invalid or the new values are taken.
    """
    if not ObjectId.is_valid(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID utilisateur invalide",
        )

    update_data = {}
    if data.username and data.username != current_user.get("username"):
        existing = await users_collection.find_one(
            {"username": data.username}
        )
        if existing and str(existing["_id"]) != current_user["_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce nom d'utilisateur est déjà utilisé",
            )
        update_data["username"] = data.username
    if data.email and data.email != current_user.get("email"):
        existing = await users_collection.find_one({"email": data.email})
        if existing and str(existing["_id"]) != current_user["_id"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cet email est déjà utilisé",
            )
        update_data["email"] = data.email
    if update_data:
        await users_collection.update_one(
            {"_id": ObjectId(current_user["_id"])},
            {"$set": update_data},
        )
    updated = await users_collection.find_one(
        {"_id": ObjectId(current_user["_id"])}
    )
    updated["_id"] = str(updated["_id"])
    return updated


@router.get(
    "/users",
    response_model=List[UserResponse],
    status_code=status.HTTP_200_OK,
)
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin_user),
):
    """List all registered users with pagination (admin only).

    Args:
        skip: Number of users to skip for pagination.
        limit: Maximum number of users to return (1-100).
        current_admin: Injected admin user dependency.

    Returns:
        A list of UserResponse objects.
    """
    users = (
        await users_collection.find()
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    for user in users:
        user["_id"] = str(user["_id"])
    return users


@router.delete(
    "/users/{user_id}", status_code=status.HTTP_200_OK
)
async def delete_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin_user),
):
    """Delete a user account by ID (admin only).

    Args:
        user_id: MongoDB ObjectId of the user to delete.
        current_admin: Injected admin user dependency.

    Returns:
        A status confirmation object.

    Raises:
        HTTPException: 400 if the ID is invalid or the admin tries to delete themselves.
        HTTPException: 404 if the user does not exist.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID utilisateur invalide",
        )
    if str(current_admin["_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account",
        )
    result = await users_collection.delete_one(
        {"_id": ObjectId(user_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return {"status": "deleted"}


@router.put(
    "/users/{user_id}/promote", status_code=status.HTTP_200_OK
)
async def promote_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin_user),
):
    """Promote a regular user to admin (admin only).

    Args:
        user_id: MongoDB ObjectId of the user to promote.
        current_admin: Injected admin user dependency.

    Returns:
        A status confirmation object.

    Raises:
        HTTPException: 400 if the user ID is invalid.
        HTTPException: 404 if the user is not found or already an admin.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID utilisateur invalide",
        )
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)}, {"$set": {"is_admin": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or already admin",
        )
    return {"status": "promoted"}


@router.put(
    "/users/{user_id}/demote", status_code=status.HTTP_200_OK
)
async def demote_user(
    user_id: str,
    current_admin: dict = Depends(get_current_admin_user),
):
    """Demote an admin user to regular user (admin only).

    Args:
        user_id: MongoDB ObjectId of the user to demote.
        current_admin: Injected admin user dependency.

    Returns:
        A status confirmation object.

    Raises:
        HTTPException: 400 if the user ID is invalid or the admin tries to demote themselves.
        HTTPException: 404 if the user is not found or already not an admin.
    """
    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID utilisateur invalide",
        )
    if str(current_admin["_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote your own admin account",
        )
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)}, {"$set": {"is_admin": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or already not admin",
        )
    return {"status": "demoted"}
