# Service for interacting with Ollama.
# Provides streaming chat responses and model management using the Ollama API.

import logging
import re
import ollama
from core.settings import settings

logger = logging.getLogger(__name__)


async def generate_chat_response_stream(messages: list, model: str = None):
    # Stream chat response from Ollama
    if model is None:
        model = settings.DEFAULT_MODEL_NAME
    client = ollama.AsyncClient(
        host=settings.OLLAMA_URL, timeout=settings.OLLAMA_TIMEOUT
    )
    try:
        options = {
            "temperature": settings.MODEL_TEMPERATURE,
            "top_p": settings.MODEL_TOP_P,
            "top_k": settings.MODEL_TOP_K,
            "repeat_penalty": settings.MODEL_REPEAT_PENALTY,
            "num_predict": settings.MODEL_NUM_PREDICT,
            "num_ctx": settings.MODEL_NUM_CTX,
        }
        if settings.MODEL_SEED is not None:
            options["seed"] = settings.MODEL_SEED
        if getattr(settings, "MODEL_STOP", None):
            options["stop"] = settings.MODEL_STOP

        buffer = ""
        inside_think = False

        async for chunk in await client.chat(
            model=model,
            messages=messages,
            stream=True,
            options=options,
            keep_alive=-1,
        ):
            content = chunk.message.content or ""
            if not content:
                continue

            buffer += content

            # Strip <think> tags from thinking models
            while True:
                if inside_think:
                    end_idx = buffer.find("</think>")
                    if end_idx == -1:
                        buffer = ""
                        break
                    else:
                        buffer = buffer[end_idx + len("</think>") :]
                        inside_think = False
                else:
                    start_idx = buffer.find("<think>")
                    if start_idx == -1:
                        to_yield = buffer
                        buffer = ""
                        if to_yield:
                            yield to_yield
                        break
                    else:
                        to_yield = buffer[:start_idx]
                        buffer = buffer[start_idx + len("<think>") :]
                        inside_think = True
                        if to_yield:
                            yield to_yield

        if buffer and not inside_think:
            yield buffer

    except ollama.ResponseError as exc:
        logger.error("Ollama response error: %s", exc)
        raise
    except Exception as exc:
        logger.error(
            "Unexpected error communicating with Ollama: %s", exc
        )
        raise
