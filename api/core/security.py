"""Security utilities for password hashing and JWT token creation.

Provides bcrypt-based password verification/hashing and HS256 JWT
encoding using the application's secret key.
"""

from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt
from core.settings import settings

# Configure passlib to use bcrypt for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a bcrypt hash from a plain-text password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token with an expiration claim.

    Args:
        data: Dictionary of claims to encode (typically contains "sub" for user ID).
        expires_delta: Optional custom expiration duration. Falls back to
            settings.ACCESS_TOKEN_EXPIRE_MINUTES if omitted.

    Returns:
        A signed HS256 JWT string.
    """
    to_encode = data.copy()

    # Calculate the expiration timestamp in UTC
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Inject the expiration claim before encoding
    to_encode.update({"exp": expire})

    # Sign the payload with the configured secret and algorithm
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt
