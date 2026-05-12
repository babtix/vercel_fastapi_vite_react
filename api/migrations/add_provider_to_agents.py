"""
Migration script to add 'provider' field to existing agents
Run this once after updating the codebase
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from core.settings import settings

async def migrate():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    agents_collection = db["agents"]
    
    # Update all agents that don't have a provider field
    result = await agents_collection.update_many(
        {"provider": {"$exists": False}},
        {"$set": {"provider": settings.DEFAULT_LLM_PROVIDER}}
    )
    
    print(f"Migration completed: Updated {result.modified_count} agents with default provider")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())
