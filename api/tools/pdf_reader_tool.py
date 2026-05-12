"""Tool for extracting text from PDF files.

Uses the pypdf library to read pages and extract text content.
Extraction runs inside a threadpool to avoid blocking the async event loop.
"""

import io
import pypdf
import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import Dict
from dependencies import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tools/pdf", tags=["Tools"])


class PdfExtractResponse(BaseModel):
    """Schema returned after extracting text from a PDF.

    Attributes:
        status: Result status — typically "success".
        filename: Original name of the uploaded file.
        pages_count: Number of pages in the PDF.
        text: Concatenated extracted text from all pages.
    """

    status: str
    filename: str
    pages_count: int
    text: str


def _extract_pdf_text_sync(file_stream) -> dict:
    """Synchronously extract text from a PDF file stream.

    Args:
        file_stream: A file-like object containing PDF data.

    Returns:
        Dictionary with pages_count and the combined extracted text.
    """
    pdf_reader = pypdf.PdfReader(file_stream)
    extracted_text = ""
    for page in pdf_reader.pages:
        text = page.extract_text()
        if text:
            extracted_text += text.strip() + "\n\n"
    return {
        "pages_count": len(pdf_reader.pages),
        "text": extracted_text.strip(),
    }


@router.post(
    "/extract-text",
    response_model=PdfExtractResponse,
    status_code=status.HTTP_200_OK,
)
async def extract_pdf_text(
    file: UploadFile = File(
        ..., description="PDF file to read"
    ),
    current_user: dict = Depends(get_current_user),
):
    """Extract plain text from an uploaded PDF file.

    Args:
        file: Uploaded PDF file.
        current_user: Injected authenticated user dependency.

    Returns:
        A PdfExtractResponse with page count and extracted text.

    Raises:
        HTTPException: 400 if the file is not a PDF.
        HTTPException: 500 if extraction fails internally.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier doit avoir l'extension .pdf",
        )

    try:
        # Read the uploaded file into memory and wrap it in a BytesIO stream
        file_bytes = await file.read()
        file_stream = io.BytesIO(file_bytes)

        # Offload CPU-bound PDF parsing to a background thread
        result = await run_in_threadpool(
            _extract_pdf_text_sync, file_stream
        )

        return PdfExtractResponse(
            status="success",
            filename=file.filename,
            **result,
        )
    except Exception as exc:
        logger.error("PDF extraction failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Échec de lecture ou extraction de texte du PDF: {str(exc)}",
        )
