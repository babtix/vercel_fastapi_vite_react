"""Authentication and authorization dependencies.

Provides reusable FastAPI dependency functions to extract, validate,
and authorize the current user from a Bearer JWT token.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from core.settings import settings
from core.database import users_collection
from bson import ObjectId

# OAuth2 scheme used to extract the Bearer token from the Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Decode and validate the JWT access token, then fetch the user from MongoDB.

    Args:
        token: Bearer token extracted from the Authorization header.

    Returns:
        The user document with `_id` converted to a string.

    Raises:
        HTTPException: 401 if the token is invalid, expired, or the user is missing.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode the JWT using the configured secret and algorithm
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    # Validate that the decoded subject is a legal MongoDB ObjectId
    if not ObjectId.is_valid(user_id):
        raise credentials_exception

    # Retrieve the user document from the database
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception

    # Normalize the ObjectId to a string before returning
    user["_id"] = str(user["_id"])
    return user


async def get_current_active_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Dependency wrapper that ensures the user is authenticated and active.

    Args:
        current_user: User dict injected by get_current_user.

    Returns:
        The current user dict unchanged.
    """
    return current_user


async def get_current_admin_user(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Dependency that enforces administrative privileges.

    Args:
        current_user: User dict injected by get_current_user.

    Returns:
        The current user dict if they are an admin.

    Raises:
        HTTPException: 403 if the user lacks admin rights.
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have administrative privileges",
        )
    return current_user
