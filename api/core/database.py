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
    """Initialize database indexes.

    Creates indexes on users and conversations.
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


__all__ = [
    "client",
    "database",
    "users_collection",
    "agents_collection",
    "conversations_collection",
    "init_db",
]
