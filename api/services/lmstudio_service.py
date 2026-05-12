# Service for interacting with LM Studio.
# Provides streaming chat responses and model listing using the LM Studio SDK.

import logging
import lmstudio as lms
from core.settings import settings

logger = logging.getLogger(__name__)


async def generate_chat_response_stream(messages: list, model_id: str = None):
    # Stream chat response from LM Studio
    if model_id is None:
        model_id = settings.LMSTUDIO_DEFAULT_MODEL

    try:
        api_host = (
            settings.LMSTUDIO_BASE_URL.replace("http://", "")
            .replace("https://", "")
            .strip()
        )
        async with lms.AsyncClient(api_host=api_host) as client:
            model = await client.llm.model(model_id)

            chat = lms.Chat()
            for msg in messages:
                if msg["role"] == "user":
                    chat.add_user_message(msg["content"])
                elif msg["role"] == "assistant":
                    chat.add_assistant_message(msg["content"])
                elif msg["role"] == "system":
                    pass

            config = {
                "temperature": settings.MODEL_TEMPERATURE,
                "max_predicted_tokens": settings.MODEL_NUM_PREDICT,
            }

            async for fragment in model.respond_stream(chat, config=config):
                if fragment.content:
                    yield fragment.content

    except Exception as exc:
        logger.error("Error communicating with LM Studio: %s", exc)
        raise


async def list_models():
    # List available models in LM Studio
    try:
        api_host = (
            settings.LMSTUDIO_BASE_URL.replace("http://", "")
            .replace("https://", "")
            .strip()
        )
        async with lms.AsyncClient(api_host=api_host) as client:
            models = await client.list_downloaded_models()
            return [
                {
                    "name": m.path,
                    "size": getattr(m.info, "size_bytes", 0),
                    "size_gb": (
                        round(
                            getattr(m.info, "size_bytes", 0) / (1024**3), 2
                        )
                        if hasattr(m.info, "size_bytes")
                        else 0
                    ),
                    "provider": "lmstudio",
                    "is_cloud": "cloud" in m.path.lower(),
                }
                for m in models
                if getattr(m, "type", "llm") == "llm"
            ]
    except Exception as exc:
        logger.error("Failed to list LM Studio models: %s", exc)
        return []
