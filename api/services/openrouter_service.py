"""Service for interacting with OpenRouter.

Provides streaming chat responses and model listing using the OpenRouter API,
which is compatible with the OpenAI SDK.
"""

import logging
import httpx
from core.settings import settings

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterError(Exception):
    """Custom exception for OpenRouter API failures."""
    pass


class OpenRouterKeyMissingError(OpenRouterError):
    """Raised when the OpenRouter API key is not configured."""
    pass


async def generate_chat_response_stream(messages: list, model: str = None):
    """Stream chat response from OpenRouter.

    Args:
        messages: List of message dicts formatted as OpenAI-compatible messages.
        model: OpenRouter model identifier (e.g. "openai/gpt-4o").
               Falls back to settings.DEFAULT_MODEL_NAME.

    Yields:
        Text chunks produced by the OpenRouter streaming response.

    Raises:
        Exception: If the OpenRouter API call fails.
    """
    if model is None:
        model = settings.DEFAULT_MODEL_NAME

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://multi-ia-consultant.vercel.app",
        "X-Title": settings.PROJECT_NAME,
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "temperature": settings.MODEL_TEMPERATURE,
        "top_p": settings.MODEL_TOP_P,
        "max_tokens": settings.MODEL_NUM_PREDICT,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
            async with client.stream(
                "POST",
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[len("data: "):]
                    if data.strip() == "[DONE]":
                        break
                    import json
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"]
                        content = delta.get("content")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
    except httpx.HTTPStatusError as exc:
        try:
            await exc.response.aread()
            error_details = exc.response.text
        except Exception:
            error_details = "<could not read streaming error body>"
        logger.error("OpenRouter HTTP error: %s — %s", exc.response.status_code, error_details)
        raise
    except Exception as exc:
        logger.error("Unexpected error communicating with OpenRouter: %s", exc)
        raise


async def list_models(api_key: str = None) -> list:
    """Fetch the list of available models from OpenRouter.

    Args:
        api_key: Optional OpenRouter API key. If not provided, reads from
                 the global settings singleton.

    Returns:
        A list of dicts with keys: name, size, size_gb, provider, is_cloud, is_free.

    Raises:
        OpenRouterKeyMissingError: If OPENROUTER_API_KEY is not configured.
        OpenRouterError: If the OpenRouter API request fails.
    """
    key = api_key or settings.OPENROUTER_API_KEY
    if not key:
        raise OpenRouterKeyMissingError(
            "Clé API OpenRouter non configurée. "
            "Rendez-vous dans Administration > Fournisseur LLM pour la renseigner."
        )

    headers = {
        "Authorization": f"Bearer {key}",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{OPENROUTER_BASE_URL}/models",
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            models = []
            for m in data.get("data", []):
                model_id = m.get("id", "")
                pricing = m.get("pricing", {})
                prompt_price = pricing.get("prompt", "0")
                completion_price = pricing.get("completion", "0")
                # A model is considered free if both prompt and completion pricing are 0
                is_free = (
                    (prompt_price == "0" or prompt_price == 0 or float(prompt_price) == 0)
                    and (completion_price == "0" or completion_price == 0 or float(completion_price) == 0)
                )
                # OpenRouter models are all cloud-based
                models.append(
                    {
                        "name": model_id,
                        "size": 0,
                        "size_gb": 0.0,
                        "provider": "openrouter",
                        "is_cloud": True,
                        "is_free": is_free,
                        "context_length": m.get("context_length", 0),
                        "description": m.get("description", ""),
                    }
                )
            return models
    except httpx.HTTPStatusError as exc:
        error_text = ""
        try:
            error_text = exc.response.text
        except Exception:
            pass
        logger.error("OpenRouter list_models HTTP error %s: %s", exc.response.status_code, error_text)
        raise OpenRouterError(
            f"Erreur OpenRouter ({exc.response.status_code}): "
            "vérifiez que votre clé API est valide."
        ) from exc
    except Exception as exc:
        logger.error("Failed to list OpenRouter models: %s", exc)
        raise OpenRouterError(
            "Impossible de contacter OpenRouter. Vérifiez votre connexion."
        ) from exc
