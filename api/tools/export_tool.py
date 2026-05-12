"""Tool for exporting chat conversations.

Supports exporting conversation history to Markdown, Plain Text, and JSON
formats with appropriate Content-Disposition headers for browser downloads.
"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from bson import ObjectId
from core.database import conversations_collection
from dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools", tags=["Tools"])


class JSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that serializes BSON ObjectId and datetime objects."""

    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        return super().default(obj)


@router.get(
    "/export/{conversation_id}", status_code=status.HTTP_200_OK
)
async def export_conversation(
    conversation_id: str,
    format: str = Query(
        "md", description="Export format: md, txt, or json"
    ),
    current_user: dict = Depends(get_current_user),
):
    """Export a conversation to Markdown, Plain Text, or JSON.

    Args:
        conversation_id: MongoDB ObjectId of the conversation to export.
        format: Desired export format — "md", "txt", or "json".
        current_user: Injected authenticated user dependency.

    Returns:
        A Response with the exported content and a download disposition header.

    Raises:
        HTTPException: 400 for invalid ID or unsupported format.
        HTTPException: 404 if the conversation is not found.
    """
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID de conversation invalide",
        )

    obj_id = ObjectId(conversation_id)
    conv = await conversations_collection.find_one(
        {"_id": obj_id, "user_id": current_user["_id"]}
    )
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation non trouvée",
        )

    title = conv.get("title", "Conversation")
    messages = conv.get("messages", [])
    filename = (
        f"chat_{title.replace(' ', '_').lower()}_{conversation_id}"
    )

    # -----------------------------------------------------------------
    # JSON export: serialize the full conversation document verbatim
    # -----------------------------------------------------------------
    if format == "json":
        json_data = json.dumps(
            conv, cls=JSONEncoder, ensure_ascii=False, indent=2
        )
        return Response(
            content=json_data,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}.json"'
            },
        )

    # -----------------------------------------------------------------
    # Plain-text export: human-readable layout with separators
    # -----------------------------------------------------------------
    elif format == "txt":
        content = f"Titre: {title}\n"
        content += "=" * 50 + "\n\n"
        for msg in messages:
            role = (
                "Vous" if msg["role"] == "user" else "Assistant IA"
            )
            content += f"[{role}] :\n{msg['content']}\n\n"
            content += "-" * 50 + "\n\n"

        return Response(
            content=content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}.txt"'
            },
        )

    # -----------------------------------------------------------------
    # Markdown export: structured headings and bold role labels
    # -----------------------------------------------------------------
    elif format == "md":
        content = f"# {title}\n\n"
        for msg in messages:
            role = (
                "**Vous**"
                if msg["role"] == "user"
                else "**Assistant IA**"
            )
            content += f"{role}:\n\n{msg['content']}\n\n---\n\n"

        return Response(
            content=content,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}.md"'
            },
        )

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format d'export non supporté (utilisez md, txt ou json)",
        )
