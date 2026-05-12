"""API endpoints for chat conversations.

Handles searching, creating, listing, renaming, deleting, and streaming
chat responses for user-agent conversations.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from fastapi.responses import StreamingResponse
from typing import List
from core.database import conversations_collection, agents_collection
from models.conversation import ConversationCreate, ConversationResponse
from dependencies import get_current_user
from services.conversation_service import (
    format_messages_for_llm,
    add_message_to_conversation,
)
from services import llm_service
from bson import ObjectId
from datetime import datetime, timezone
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class ChatRequest(BaseModel):
    """Schema for sending a new message in a conversation.

    Attributes:
        message: The user's text input.
    """

    message: str


class ConversationRename(BaseModel):
    """Schema for renaming an existing conversation.

    Attributes:
        title: New title for the conversation.
    """

    title: str


@router.get(
    "/search/",
    response_model=List[ConversationResponse],
    status_code=status.HTTP_200_OK,
)
async def search_conversations(
    q: str = Query("", min_length=1, description="Search query"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Search conversations by title or message content.

    Args:
        q: Search string to match against titles and message contents.
        skip: Number of results to skip for pagination.
        limit: Maximum number of results to return (1-100).
        current_user: Injected authenticated user dependency.

    Returns:
        A list of ConversationResponse objects matching the query.
    """
    import re

    safe_q = re.escape(q)
    filter_query = {
        "user_id": current_user["_id"],
        "$or": [
            {"title": {"$regex": safe_q, "$options": "i"}},
            {"messages.content": {"$regex": safe_q, "$options": "i"}},
        ],
    }
    conversations = (
        await conversations_collection.find(filter_query)
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    for conv in conversations:
        conv["_id"] = str(conv["_id"])
    return conversations


@router.post(
    "/",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    conv_in: ConversationCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new conversation tied to a specific agent.

    Args:
        conv_in: Conversation creation payload containing title and agent_id.
        current_user: Injected authenticated user dependency.

    Returns:
        The newly created conversation serialized as a ConversationResponse.

    Raises:
        HTTPException: 400 if the agent ID is invalid.
        HTTPException: 404 if the referenced agent does not exist.
    """
    if not ObjectId.is_valid(conv_in.agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent ID invalide",
        )

    agent = await agents_collection.find_one(
        {"_id": ObjectId(conv_in.agent_id)}
    )
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )

    conv_dict = conv_in.model_dump()
    conv_dict["user_id"] = current_user["_id"]
    conv_dict["messages"] = []
    conv_dict["created_at"] = datetime.now(timezone.utc)
    conv_dict["updated_at"] = datetime.now(timezone.utc)

    result = await conversations_collection.insert_one(conv_dict)
    conv_dict["_id"] = str(result.inserted_id)
    return conv_dict


@router.get(
    "/",
    response_model=List[ConversationResponse],
    status_code=status.HTTP_200_OK,
)
async def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List all conversations for the authenticated user.

    Args:
        skip: Number of results to skip for pagination.
        limit: Maximum number of results to return (1-100).
        current_user: Injected authenticated user dependency.

    Returns:
        A list of ConversationResponse objects ordered by most recently updated.
    """
    conversations = (
        await conversations_collection.find(
            {"user_id": current_user["_id"]}
        )
        .sort("updated_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    for conv in conversations:
        conv["_id"] = str(conv["_id"])
    return conversations


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
    status_code=status.HTTP_200_OK,
)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve a specific conversation by ID.

    Args:
        conversation_id: MongoDB ObjectId of the conversation.
        current_user: Injected authenticated user dependency.

    Returns:
        The requested ConversationResponse.

    Raises:
        HTTPException: 400 if the conversation ID is invalid.
        HTTPException: 404 if the conversation is not found.
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de conversation invalide",
        )
    conv = await conversations_collection.find_one(
        {
            "_id": ObjectId(conversation_id),
            "user_id": current_user["_id"],
        }
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    conv["_id"] = str(conv["_id"])
    return conv


@router.put(
    "/{conversation_id}",
    response_model=ConversationResponse,
    status_code=status.HTTP_200_OK,
)
async def rename_conversation(
    conversation_id: str,
    rename_data: ConversationRename,
    current_user: dict = Depends(get_current_user),
):
    """Rename an existing conversation.

    Args:
        conversation_id: MongoDB ObjectId of the conversation to rename.
        rename_data: Payload containing the new title.
        current_user: Injected authenticated user dependency.

    Returns:
        The updated ConversationResponse.

    Raises:
        HTTPException: 400 if the conversation ID is invalid.
        HTTPException: 404 if the conversation is not found.
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de conversation invalide",
        )
    conv = await conversations_collection.find_one(
        {
            "_id": ObjectId(conversation_id),
            "user_id": current_user["_id"],
        }
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$set": {
                "title": rename_data.title,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    conv["title"] = rename_data.title
    conv["_id"] = str(conv["_id"])
    return conv


@router.post(
    "/{conversation_id}/chat", status_code=status.HTTP_200_OK
)
async def chat(
    conversation_id: str,
    request_data: ChatRequest,
    req: Request,
    current_user: dict = Depends(get_current_user),
):
    """Stream a chat response from the assigned agent.

    Saves the user's message, formats the conversation history for the LLM,
    and yields generated tokens as a plain-text streaming response. If RAG
    context chunks are present, source filenames are appended at the end.

    Args:
        conversation_id: MongoDB ObjectId of the active conversation.
        request_data: ChatRequest containing the user's message.
        req: Underlying HTTP request used to detect client disconnects.
        current_user: Injected authenticated user dependency.

    Returns:
        A StreamingResponse yielding LLM-generated text chunks.

    Raises:
        HTTPException: 400 if the conversation ID is invalid.
        HTTPException: 404 if the conversation is not found.
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de conversation invalide",
        )

    conv = await conversations_collection.find_one(
        {
            "_id": ObjectId(conversation_id),
            "user_id": current_user["_id"],
        }
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    # Save user message
    await add_message_to_conversation(
        conversation_id, "user", request_data.message
    )

    # Prepare messages for LLM
    messages_for_llm, model_name, provider, context_chunks = (
        await format_messages_for_llm(conversation_id)
    )

    async def stream_generator():
        full_response = ""
        try:
            async for text_chunk in llm_service.generate_chat_response_stream(
                messages_for_llm, model=model_name, provider=provider
            ):
                # Stop if client disconnected
                if await req.is_disconnected():
                    logger.info(
                        "Client disconnected, stopping generation..."
                    )
                    break

                full_response += text_chunk
                yield text_chunk

        except Exception as e:
            logger.error("Error during chat generation: %s", e)
        finally:
            # Save assistant response
            if full_response.strip():
                if context_chunks:
                    unique_sources = list(
                        set(
                            [
                                c.get("filename", "Inconnu")
                                for c in context_chunks
                            ]
                        )
                    )
                    sources_text = (
                        "\n\n---\n**Sources RAG :** "
                        + ", ".join(unique_sources)
                    )
                    full_response += sources_text
                    yield sources_text

                await add_message_to_conversation(
                    conversation_id, "assistant", full_response
                )

    return StreamingResponse(stream_generator(), media_type="text/plain")


@router.delete(
    "/{conversation_id}", status_code=status.HTTP_200_OK
)
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a conversation by ID.

    Args:
        conversation_id: MongoDB ObjectId of the conversation to delete.
        current_user: Injected authenticated user dependency.

    Returns:
        A status confirmation object.

    Raises:
        HTTPException: 400 if the conversation ID is invalid.
        HTTPException: 404 if the conversation is not found.
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de conversation invalide",
        )
    result = await conversations_collection.delete_one(
        {
            "_id": ObjectId(conversation_id),
            "user_id": current_user["_id"],
        }
    )
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return {"status": "deleted"}
