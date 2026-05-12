"""MongoDB database configuration and initialization.

Establishes an async connection to MongoDB using Motor and exposes
typed collection objects for users, agents, and conversations. Also
provides an initialization helper to create required indexes.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from core.settings import settings

client = AsyncIOMotorClient(settings.MONGODB_URL)
"""Async MongoDB client instance shared across the application."""

database = client[settings.DATABASE_NAME]
"""Reference to the primary MongoDB database."""

# MongoDB Collections
users_collection = database.get_collection("users")
"""Collection storing user account documents."""

agents_collection = database.get_collection("agents")
"""Collection storing AI agent configuration documents."""

conversations_collection = database.get_collection("conversations")
"""Collection storing chat conversation and message history documents."""


async def init_db() -> None:
    """Initialize database indexes and seed the default admin account for testing.

    Creates indexes on users and conversations, and checks if the admin user
    'babtich' exists. If not, automatically registers the admin account with 'babtich123'.
    """
    import pymongo

    await users_collection.create_index(
        [("email", pymongo.ASCENDING)], unique=True
    )
    await users_collection.create_index(
        [("username", pymongo.ASCENDING)], unique=True
    )
    await conversations_collection.create_index(
        [("user_id", pymongo.ASCENDING), ("updated_at", pymongo.DESCENDING)]
    )

    # Seed the test admin account 'babtich' / 'babtich123' if it doesn't exist
    admin_exists = await users_collection.find_one({"username": "babtich"})
    if not admin_exists:
        try:
            from core.security import get_password_hash
            hashed = get_password_hash("babtich123")
            await users_collection.insert_one({
                "username": "babtich",
                "email": "admin@babtich.com",
                "hashed_password": hashed,
                "is_admin": True
            })
            print("Successfully seeded testing admin account: 'babtich'")
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning("Could not seed default admin: %s", exc)


__all__ = [
    "client",
    "database",
    "users_collection",
    "agents_collection",
    "conversations_collection",
    "init_db",
]
