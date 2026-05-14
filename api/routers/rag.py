"""API endpoints for RAG (Retrieval-Augmented Generation).

Handles document upload, multi-document ingestion, listing, deletion,
and semantic search against agent-specific knowledge bases.
"""

import os
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List, Dict
from bson import ObjectId
from dependencies import get_current_user, get_current_admin_user
from services import rag_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG"])

# Allowed file extensions for indexing
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".csv"}


class UploadResponse(BaseModel):
    """Schema returned after a single document is successfully indexed.

    Attributes:
        status: Operation result — typically "success".
        message: Human-readable confirmation message.
        filename: Original name of the uploaded file.
        doc_hash: Unique hash identifying the indexed document.
        total_chars: Total character count of the extracted text.
        chunks_count: Number of chunks generated and stored.
    """

    status: str
    message: str
    filename: str
    doc_hash: str
    total_chars: int
    chunks_count: int


class MultiUploadResponse(BaseModel):
    """Schema returned after a batch document upload attempt.

    Attributes:
        status: "success" if all files indexed, otherwise "partial".
        indexed: List of metadata dicts for successfully indexed files.
        errors: List of error dicts for failed files.
        total_indexed: Count of successful ingestions.
        total_errors: Count of failed ingestions.
    """

    status: str
    indexed: List[Dict]
    errors: List[Dict]
    total_indexed: int
    total_errors: int


class DocumentsResponse(BaseModel):
    """Schema wrapping the list of indexed documents for an agent.

    Attributes:
        documents: List of document metadata dictionaries.
        total_documents: Number of distinct documents.
        total_chunks: Total number of chunks across all documents.
    """

    documents: List[Dict]
    total_documents: int
    total_chunks: int


class DeleteResponse(BaseModel):
    """Schema returned after a document deletion operation.

    Attributes:
        status: Operation result — typically "deleted".
        chunks_deleted: Number of vector chunks removed.
    """

    status: str
    chunks_deleted: int


class SearchResponse(BaseModel):
    """Schema returned from a RAG semantic search query.

    Attributes:
        query: The original search text.
        results: List of retrieved chunk dictionaries.
        total_results: Number of chunks returned.
    """

    query: str
    results: List[Dict]
    total_results: int


class RagStatusResponse(BaseModel):
    """Schema returned from the RAG health-check endpoint.

    Attributes:
        embedding_ready: Whether the local embedding model is loaded and working.
        embedding_model_name: Name of the configured embedding model.
        chroma_available: Whether ChromaDB is installed and functional.
        message: Human-readable status message.
    """

    embedding_ready: bool
    embedding_model_name: str
    chroma_available: bool
    message: str


def _validate_file(filename: str):
    """Validate that a file has an allowed extension for RAG indexing.

    Args:
        filename: Name of the uploaded file.

    Raises:
        HTTPException: 400 if the extension is not in ALLOWED_EXTENSIONS.
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non supporté: {ext}. Types autorisés: {', '.join(ALLOWED_EXTENSIONS)}",
        )


@router.post(
    "/{agent_id}/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_document(
    agent_id: str,
    file: UploadFile = File(
        ..., description="Document to index (PDF, DOCX, TXT, MD)"
    ),
    current_user: dict = Depends(get_current_admin_user),
):
    """Upload and index a single document into an agent's knowledge base.

    Args:
        agent_id: MongoDB ObjectId of the target agent.
        file: Uploaded document file.
        current_user: Injected admin user dependency.

    Returns:
        An UploadResponse with indexing metadata.

    Raises:
        HTTPException: 400 if the agent ID or file type is invalid.
        HTTPException: 500 if ingestion fails unexpectedly.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )

    _validate_file(file.filename)

    try:
        file_bytes = await file.read()
        result = await run_in_threadpool(
            rag_service.ingest_document, agent_id, file.filename, file_bytes
        )
        return UploadResponse(
            status="success",
            message=f"Document '{file.filename}' indexé avec succès",
            **result,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        logger.error("RAG ingestion error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'indexation: {str(e)}",
        )


@router.post(
    "/{agent_id}/upload-multiple",
    response_model=MultiUploadResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_multiple_documents(
    agent_id: str,
    files: List[UploadFile] = File(
        ..., description="Documents to index"
    ),
    current_user: dict = Depends(get_current_admin_user),
):
    """Upload and index multiple documents into an agent's knowledge base.

    Args:
        agent_id: MongoDB ObjectId of the target agent.
        files: List of uploaded document files.
        current_user: Injected admin user dependency.

    Returns:
        A MultiUploadResponse summarizing successes and failures.

    Raises:
        HTTPException: 400 if the agent ID is invalid.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )

    results = []
    errors = []

    for f in files:
        try:
            _validate_file(f.filename)
            file_bytes = await f.read()
            result = await run_in_threadpool(
                rag_service.ingest_document,
                agent_id,
                f.filename,
                file_bytes,
            )
            results.append(result)
        except Exception as e:
            errors.append({"filename": f.filename, "error": str(e)})

    return MultiUploadResponse(
        status="success" if not errors else "partial",
        indexed=results,
        errors=errors,
        total_indexed=len(results),
        total_errors=len(errors),
    )


@router.get(
    "/{agent_id}/documents",
    response_model=DocumentsResponse,
    status_code=status.HTTP_200_OK,
)
async def list_documents(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
):
    """List all indexed documents for a given agent.

    Args:
        agent_id: MongoDB ObjectId of the agent.
        current_user: Injected authenticated user dependency.

    Returns:
        A DocumentsResponse with document metadata and chunk counts.

    Raises:
        HTTPException: 400 if the agent ID is invalid.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )

    documents = await run_in_threadpool(
        rag_service.list_documents, agent_id
    )
    total_chunks = await run_in_threadpool(
        rag_service.get_agent_doc_count, agent_id
    )
    return DocumentsResponse(
        documents=documents,
        total_documents=len(documents),
        total_chunks=total_chunks,
    )


@router.delete(
    "/{agent_id}/documents/{doc_hash}",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_document(
    agent_id: str,
    doc_hash: str,
    current_user: dict = Depends(get_current_admin_user),
):
    """Delete a specific document from an agent's knowledge base.

    Args:
        agent_id: MongoDB ObjectId of the agent.
        doc_hash: Unique hash of the document to remove.
        current_user: Injected admin user dependency.

    Returns:
        A DeleteResponse confirming the number of chunks deleted.

    Raises:
        HTTPException: 400 if the agent ID is invalid.
        HTTPException: 404 if the document is not found.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )

    deleted = await run_in_threadpool(
        rag_service.delete_document, agent_id, doc_hash
    )
    if deleted == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé",
        )
    return DeleteResponse(status="deleted", chunks_deleted=deleted)


@router.delete(
    "/{agent_id}/documents",
    response_model=DeleteResponse,
    status_code=status.HTTP_200_OK,
)
async def delete_all_documents(
    agent_id: str,
    current_user: dict = Depends(get_current_admin_user),
):
    """Delete all documents from an agent's knowledge base.

    Args:
        agent_id: MongoDB ObjectId of the agent.
        current_user: Injected admin user dependency.

    Returns:
        A DeleteResponse with the total number of chunks removed.

    Raises:
        HTTPException: 400 if the agent ID is invalid.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )

    deleted = await run_in_threadpool(
        rag_service.delete_all_documents, agent_id
    )
    return DeleteResponse(status="deleted", chunks_deleted=deleted)


@router.post(
    "/{agent_id}/search",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK,
)
async def search_documents(
    agent_id: str,
    query: str = Form(...),
    top_k: int = Form(5),
    current_user: dict = Depends(get_current_user),
):
    """Perform a semantic search against an agent's knowledge base.

    Args:
        agent_id: MongoDB ObjectId of the agent.
        query: Natural language search text.
        top_k: Maximum number of chunks to retrieve.
        current_user: Injected authenticated user dependency.

    Returns:
        A SearchResponse containing the query and matched chunks.

    Raises:
        HTTPException: 400 if the agent ID is invalid.
    """
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID d'agent invalide",
        )

    chunks = await run_in_threadpool(
        rag_service.retrieve_context, agent_id, query, top_k=top_k
    )
    return SearchResponse(
        query=query,
        results=chunks,
        total_results=len(chunks),
    )


@router.get(
    "/status",
    response_model=RagStatusResponse,
    status_code=status.HTTP_200_OK,
)
async def rag_status(
    current_user: dict = Depends(get_current_user),
):
    """Return the current health of the RAG pipeline.

    Checks whether Ollama is reachable and whether the configured
    embedding model is available.

    Returns:
        A RagStatusResponse with prerequisite flags and a message.
    """
    status_data = await run_in_threadpool(rag_service.get_rag_status)
    return RagStatusResponse(**status_data)
