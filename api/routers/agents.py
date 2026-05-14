"""API endpoints for managing AI Agents.

Handles listing, creating, updating, and deleting agents, including
logo image uploads and markdown system prompt ingestion.
"""

import os
import shutil
import re
import logging
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from core.database import agents_collection
from models.agent import AgentResponse, AgentDeleteResponse
from dependencies import get_current_user, get_current_admin_user
from core.settings import settings
from bson import ObjectId

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents", tags=["Agents"])

# Setup logo upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "logos")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError as exc:
    logger.warning("Could not create upload directory (might be on read-only serverless environment): %s", exc)


AGENT_LOGO_ALLOWED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
}


def _save_logo_sync(logo_file, file_path: str) -> None:
    """Synchronously copy an uploaded logo file to disk.

    Args:
        logo_file: File-like object from the upload.
        file_path: Destination path on the filesystem.
    """
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(logo_file, buffer)


@router.get(
    "/", response_model=List[AgentResponse], status_code=status.HTTP_200_OK
)
async def list_agents(
    current_user: dict = Depends(get_current_user),
):
    """List all available AI agents.

    Args:
        current_user: Injected authenticated user dependency.

    Returns:
        A list of AgentResponse objects, each representing an agent configuration.
    """
    agents = await agents_collection.find().to_list(100)
    for agent in agents:
        agent["_id"] = str(agent["_id"])
    return agents


@router.post(
    "/",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_agent(
    name: str = Form(...),
    description: str = Form(...),
    model_name: Optional[str] = Form(settings.DEFAULT_MODEL_NAME),
    provider: Optional[str] = Form(settings.DEFAULT_LLM_PROVIDER),
    rag_enabled: Optional[bool] = Form(False),
    prompt_file: UploadFile = File(
        ..., description="Markdown file with system prompt"
    ),
    logo_file: Optional[UploadFile] = File(
        None, description="Agent logo image"
    ),
    current_user: dict = Depends(get_current_admin_user),
):
    """Create a new AI agent with a system prompt and optional logo.

    Args:
        name: Display name for the agent.
        description: Short summary of the agent's purpose.
        model_name: Target LLM model identifier.
        provider: LLM provider ("ollama" or "lmstudio").
        rag_enabled: Whether to enable Retrieval-Augmented Generation.
        prompt_file: Uploaded `.md` file containing the system prompt.
        logo_file: Optional uploaded image file for the agent logo.
        current_user: Injected admin user dependency.

    Returns:
        The newly created agent serialized as an AgentResponse.

    Raises:
        HTTPException: 400 if the prompt file is not markdown or the logo type is disallowed.
    """
    if not prompt_file.filename.endswith(".md"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier prompt doit être un .md",
        )

    prompt_content = await prompt_file.read()
    system_prompt = prompt_content.decode("utf-8")

    logo_url = None
    if logo_file:
        import re
        file_extension = os.path.splitext(logo_file.filename)[1]

        if file_extension.lower() not in AGENT_LOGO_ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type not allowed.",
            )

        safe_name = re.sub(
            r"[^a-zA-Z0-9_]", "", name.replace(" ", "_").lower()
        )
        safe_filename = os.path.basename(
            f"{safe_name}{file_extension}"
        )
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        # Save logo file using threadpool (gracefully skip on read-only fs)
        try:
            await run_in_threadpool(
                _save_logo_sync, logo_file.file, file_path
            )
            logo_url = f"/static/logos/{safe_filename}"
        except OSError as exc:
            logger.warning(
                "Could not save agent logo on read-only filesystem: %s", exc
            )

    agent_dict = {
        "name": name,
        "description": description,
        "system_prompt": system_prompt,
        "model_name": model_name,
        "provider": provider or settings.DEFAULT_LLM_PROVIDER,
        "logo_url": logo_url,
        "rag_enabled": rag_enabled,
    }

    result = await agents_collection.insert_one(agent_dict)
    agent_dict["_id"] = str(result.inserted_id)
    return agent_dict


@router.put(
    "/{agent_id}",
    response_model=AgentResponse,
    status_code=status.HTTP_200_OK,
)
async def update_agent(
    agent_id: str,
    name: str = Form(...),
    description: str = Form(...),
    model_name: Optional[str] = Form(settings.DEFAULT_MODEL_NAME),
    provider: Optional[str] = Form(settings.DEFAULT_LLM_PROVIDER),
    rag_enabled: Optional[bool] = Form(False),
    prompt_file: Optional[UploadFile] = File(
        None, description="New optional markdown prompt"
    ),
    logo_file: Optional[UploadFile] = File(
        None, description="New optional agent logo"
    ),
    current_user: dict = Depends(get_current_admin_user),
):
    """Update an existing AI agent's configuration, prompt, or logo.

    Args:
        agent_id: MongoDB ObjectId of the agent to update.
        name: Updated display name.
        description: Updated description.
        model_name: Updated target LLM model.
        provider: Updated LLM provider.
        rag_enabled: Updated RAG toggle.
        prompt_file: Optional new markdown system prompt file.
        logo_file: Optional new logo image file.
        current_user: Injected admin user dependency.

    Returns:
        The updated agent serialized as an AgentResponse.

    Raises:
        HTTPException: 400 if the agent ID is invalid or the logo type is disallowed.
        HTTPException: 404 if the agent does not exist.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )

    existing_agent = await agents_collection.find_one(
        {"_id": ObjectId(agent_id)}
    )
    if not existing_agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent non trouvé",
        )

    update_data = {
        "name": name,
        "description": description,
        "model_name": model_name,
        "provider": provider or settings.DEFAULT_LLM_PROVIDER,
        "rag_enabled": rag_enabled,
    }

    if prompt_file and prompt_file.filename.endswith(".md"):
        prompt_content = await prompt_file.read()
        update_data["system_prompt"] = prompt_content.decode("utf-8")

    if logo_file:
        import re
        file_extension = os.path.splitext(logo_file.filename)[1]

        if file_extension.lower() not in AGENT_LOGO_ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File type not allowed.",
            )

        safe_name = re.sub(
            r"[^a-zA-Z0-9_]", "", name.replace(" ", "_").lower()
        )
        safe_filename = os.path.basename(
            f"{safe_name}{file_extension}"
        )
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        try:
            await run_in_threadpool(
                _save_logo_sync, logo_file.file, file_path
            )
            update_data["logo_url"] = f"/static/logos/{safe_filename}"
        except OSError as exc:
            logger.warning(
                "Could not save agent logo on read-only filesystem: %s", exc
            )

    await agents_collection.update_one(
        {"_id": ObjectId(agent_id)}, {"$set": update_data}
    )

    updated_agent = await agents_collection.find_one(
        {"_id": ObjectId(agent_id)}
    )
    updated_agent["_id"] = str(updated_agent["_id"])
    return updated_agent


@router.delete(
    "/{agent_id}",
    response_model=AgentDeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    """Delete an AI agent by its ID.

    Args:
        agent_id: MongoDB ObjectId of the agent to delete.
        current_user: Injected admin user dependency.

    Returns:
        An AgentDeleteResponse confirming the deletion.

    Raises:
        HTTPException: 400 if the agent ID is invalid.
        HTTPException: 404 if the agent does not exist.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )
    result = await agents_collection.delete_one(
        {"_id": ObjectId(agent_id)}
    )
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent non trouvé",
        )
    return {"status": "deleted", "deleted_id": agent_id}
