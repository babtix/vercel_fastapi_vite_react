"""Unified LLM service router.

Routes streaming chat requests to the appropriate backend provider
(OpenRouter, Ollama, or LM Studio) based on the configured or per-request provider.
"""

from core.settings import settings
from services import ollama_service, lmstudio_service, openrouter_service


class LLMServiceException(Exception):
    """Custom exception raised when an LLM provider fails to generate a response."""
    pass


async def generate_chat_response_stream(
    messages: list, model: str = None, provider: str = None
):
    """Yield text chunks from a streaming LLM chat response.

    Args:
        messages: List of message dicts formatted for the LLM API.
        model: Target model identifier. Falls back to settings.DEFAULT_MODEL_NAME.
        provider: LLM provider name ("openrouter", "ollama", or "lmstudio").
                  Falls back to settings.DEFAULT_LLM_PROVIDER.

    Yields:
        Text chunks produced by the selected provider's streaming generator.

    Raises:
        LLMServiceException: If the provider call fails for any reason.
    """
    # Resolve provider from argument or global default
    if provider is None:
        provider = settings.DEFAULT_LLM_PROVIDER

    try:
        if provider.lower() == "openrouter":
            async for chunk in openrouter_service.generate_chat_response_stream(
                messages, model
            ):
                yield chunk
        elif provider.lower() == "lmstudio":
            async for chunk in lmstudio_service.generate_chat_response_stream(
                messages, model
            ):
                yield chunk
        else:
            # Legacy Ollama fallback
            async for chunk in ollama_service.generate_chat_response_stream(
                messages, model
            ):
                yield chunk
    except Exception as exc:
        # Wrap underlying exceptions so callers can handle them uniformly
        raise LLMServiceException(
            f"Provider '{provider}' failed: {exc}"
        ) from exc
