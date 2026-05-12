"""API endpoints for background research tasks via n8n.

Triggers external research workflows through n8n webhooks, receives
resulting context summaries, and exposes a status endpoint for polling.
"""

import logging
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel
import httpx
from core.settings import settings
from services.conversation_service import (
    set_research_context,
    get_research_context,
    pop_research_context,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Research"])


class TriggerResearchPayload(BaseModel):
    """Schema for initiating a background research request.

    Attributes:
        topic: Research subject or query string.
        session_id: Unique identifier for the user's chat session.
    """

    topic: str
    session_id: str


class InjectContextPayload(BaseModel):
    """Schema used by n8n to push research results back into the backend.

    Attributes:
        session_id: Target chat session identifier.
        summary: Compiled research summary to inject as system context.
    """

    session_id: str
    summary: str


class StatusResponse(BaseModel):
    """Schema representing the current state of a research task.

    Attributes:
        status: One of "pending", "ready", or "error".
    """

    status: str


class OkResponse(BaseModel):
    """Generic success response schema.

    Attributes:
        status: Result identifier — typically "ok".
        message: Human-readable confirmation text.
    """

    status: str
    message: str


def send_n8n_webhook(topic: str, session_id: str):
    """Synchronously send a research request to the configured n8n webhook.

    Args:
        topic: Research subject passed to the workflow.
        session_id: Chat session identifier for correlation.
    """
    try:
        webhook_url = settings.N8N_WEBHOOK_URL
        response = httpx.post(
            webhook_url,
            json={"topic": topic, "session_id": session_id},
            timeout=5.0,
        )
        if response.status_code != 200:
            logger.error(
                "n8n webhook failed with status %s", response.status_code
            )
            set_research_context(session_id, "ERROR_WEBHOOK_FAILED")
    except Exception as e:
        logger.error("Error calling n8n webhook: %s", e)
        set_research_context(session_id, "ERROR_WEBHOOK_FAILED")


@router.post(
    "/trigger-research",
    response_model=OkResponse,
    status_code=status.HTTP_200_OK,
)
async def trigger_research(
    background_tasks: BackgroundTasks,
    payload: TriggerResearchPayload,
):
    """Trigger a new background research task via n8n.

    Args:
        background_tasks: FastAPI background task runner.
        payload: TriggerResearchPayload containing topic and session_id.

    Returns:
        An OkResponse confirming the task was queued.

    Raises:
        HTTPException: 400 if topic or session_id is missing.
    """
    if not payload.topic or not payload.session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing topic or session_id",
        )

    background_tasks.add_task(
        send_n8n_webhook, payload.topic, payload.session_id
    )
    return OkResponse(status="ok", message="Research triggered")


@router.post(
    "/inject-context",
    response_model=OkResponse,
    status_code=status.HTTP_200_OK,
)
async def inject_context(payload: InjectContextPayload):
    """Inject research results into a chat session (webhook target for n8n).

    Args:
        payload: InjectContextPayload with session_id and summary.

    Returns:
        An OkResponse confirming successful context injection.

    Raises:
        HTTPException: 422 if session_id or summary is missing.
    """
    logger.debug(
        "Received payload in inject_context: %s", payload.model_dump()
    )

    if payload.session_id and payload.summary:
        hidden_prompt = (
            "System Context Update: Use the following real-time data "
            f"to answer the user's next prompt: {payload.summary}"
        )
        set_research_context(payload.session_id, hidden_prompt)
        logger.debug(
            "Context successfully injected for session: %s",
            payload.session_id,
        )
        return OkResponse(
            status="ok", message="Context injected successfully"
        )

    logger.error("Missing session_id or summary in the n8n payload.")
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Missing session_id or summary in payload",
    )


@router.get(
    "/research-status/{session_id}",
    response_model=StatusResponse,
    status_code=status.HTTP_200_OK,
)
async def research_status(session_id: str):
    """Check the status of a background research task for a given session.

    Args:
        session_id: Chat session identifier to look up.

    Returns:
        A StatusResponse with status "pending", "ready", or "error".
    """
    context = get_research_context(session_id)
    if context is not None:
        if context == "ERROR_WEBHOOK_FAILED":
            pop_research_context(session_id)
            return StatusResponse(status="error")
        return StatusResponse(status="ready")
    return StatusResponse(status="pending")
