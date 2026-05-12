"""Service for managing chat conversations and LLM message formatting.

Handles retrieval of conversation/agent data, injection of RAG context
and n8n research summaries into the system prompt, and appending new
messages to the persistent MongoDB store.
"""

import logging
from fastapi.concurrency import run_in_threadpool
from core.database import conversations_collection, agents_collection
from bson import ObjectId
from datetime import datetime, timezone
from core.settings import settings
from services import rag_service

logger = logging.getLogger(__name__)

# In-memory dictionary used as a transient store for n8n research contexts.
# Keys are conversation IDs; values are research summary strings.
_research_contexts: dict[str, str] = {}


def set_research_context(conversation_id: str, context: str) -> None:
    """Store a research summary for a specific conversation session."""
    _research_contexts[conversation_id] = context


def get_research_context(conversation_id: str) -> str | None:
    """Retrieve the stored research summary for a conversation without removing it."""
    return _research_contexts.get(conversation_id)


def pop_research_context(conversation_id: str) -> str | None:
    """Retrieve and remove the research summary for a conversation (consume-once semantics)."""
    return _research_contexts.pop(conversation_id, None)


async def format_messages_for_llm(
    conversation_id: str, injected_system_context: str | None = None
):
    """Build the message list for an LLM call, including system prompt and context.

    This function performs the following steps:
      1. Loads the conversation and its assigned agent.
      2. Starts with the agent's base system prompt (if any).
      3. If RAG is enabled, retrieves relevant document chunks using the last
         user message as the query and appends them to the system prompt.
      4. If a research context exists (either injected or from n8n), appends it.
      5. Prepends the final system prompt to the conversation history.

    Args:
        conversation_id: MongoDB ObjectId of the conversation.
        injected_system_context: Optional manually injected context string.

    Returns:
        A tuple of (messages_for_llm, model_name, provider, context_chunks).
    """
    # Load conversation document from MongoDB
    conv = await conversations_collection.find_one(
        {"_id": ObjectId(conversation_id)}
    )
    if not conv:
        return (
            [],
            settings.DEFAULT_MODEL_NAME,
            settings.DEFAULT_LLM_PROVIDER,
            [],
        )

    # Load the associated agent to get system prompt and configuration
    agent = await agents_collection.find_one(
        {"_id": ObjectId(conv["agent_id"])}
    )

    messages_for_llm = []

    # Initialize system prompt from the agent's stored configuration
    system_prompt = ""
    if agent and "system_prompt" in agent:
        system_prompt = agent["system_prompt"]

    context_chunks = []
    # Inject RAG context if the agent has RAG enabled
    if agent and agent.get("rag_enabled", False):
        # Identify the most recent user message to use as the retrieval query
        user_messages = [
            m for m in conv.get("messages", []) if m["role"] == "user"
        ]
        if user_messages:
            last_query = user_messages[-1]["content"]
            agent_id = str(agent["_id"])

            try:
                # Run semantic search in a threadpool since ChromaDB is synchronous
                context_chunks = await run_in_threadpool(
                    rag_service.retrieve_context, agent_id, last_query
                )
                if context_chunks:
                    # Build a structured RAG block and append it to the system prompt
                    rag_block = rag_service.build_rag_prompt(context_chunks)
                    system_prompt += rag_block
            except Exception as e:
                logger.warning("RAG retrieval error: %s", e)

    # Inject n8n research context if available (consume-once from in-memory store)
    effective_context = injected_system_context
    if effective_context is None:
        effective_context = pop_research_context(conversation_id)

    if effective_context:
        # Append research context to the existing system prompt, or use it standalone
        if system_prompt:
            system_prompt += "\n\n" + effective_context
        else:
            system_prompt = effective_context

    # Prepend the assembled system prompt as the first message
    if system_prompt:
        messages_for_llm.append(
            {"role": "system", "content": system_prompt}
        )

    # Append the full conversation history (user + assistant messages)
    for msg in conv.get("messages", []):
        messages_for_llm.append(
            {"role": msg["role"], "content": msg["content"]}
        )

    # Resolve the model and provider, falling back to global defaults if needed
    model_name = (
        agent.get("model_name", settings.DEFAULT_MODEL_NAME)
        if agent
        else settings.DEFAULT_MODEL_NAME
    )
    provider = (
        agent.get("provider", settings.DEFAULT_LLM_PROVIDER)
        if agent
        else settings.DEFAULT_LLM_PROVIDER
    )

    return messages_for_llm, model_name, provider, context_chunks


async def format_messages_for_ollama(conversation_id: str):
    """Deprecated compatibility wrapper around format_messages_for_llm."""
    messages, model_name, _, _ = await format_messages_for_llm(
        conversation_id
    )
    return messages, model_name


async def add_message_to_conversation(
    conversation_id: str, role: str, content: str
):
    """Append a new message to a conversation and update its timestamp.

    Args:
        conversation_id: MongoDB ObjectId of the target conversation.
        role: Message role ("user" or "assistant").
        content: Text content of the message.

    Returns:
        The inserted message dictionary.
    """
    msg_dict = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc),
    }

    # Atomically push the message and refresh the updated_at field
    await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$push": {"messages": msg_dict},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    return msg_dict
