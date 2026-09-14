import logging
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from app.services.validation_service import (
    validate_package, get_history, get_validation_by_id, get_daily_stats
)
from app.models.schemas import ValidationResult, HistoryItem, DailyStats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["validation"])


@router.post("/validate", response_model=ValidationResult)
async def validate_ota_package(
    package_name: str = Form(...),
    description: str = Form(default=""),
    file: Optional[UploadFile] = File(default=None)
):
    """
    Validate an OTA update package.
    Accepts multipart form with optional binary file upload.
    """
    file_content: bytes = b""
    file_size_kb: float = 0.0

    if file and file.filename:
        file_content = await file.read()
        file_size_kb = len(file_content) / 1024
        logger.info(f"Received file: {file.filename} ({file_size_kb:.1f} KB)")

    try:
        result = validate_package(
            package_name=package_name,
            description=description,
            file_content=file_content if file_content else None,
            file_size_kb=file_size_kb
        )
        return result
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=list[HistoryItem])
async def get_validation_history(limit: int = 20):
    """Return recent validation history."""
    return get_history(limit=min(limit, 100))


@router.get("/validation/{validation_id}", response_model=ValidationResult)
async def get_validation_detail(validation_id: str):
    """Get full details for a specific validation."""
    result = get_validation_by_id(validation_id)
    if not result:
        raise HTTPException(status_code=404, detail="Validation not found")
    return result


@router.get("/stats", response_model=DailyStats)
async def get_stats():
    """Daily stats: token usage, risk distribution, validation count."""
    return get_daily_stats()


@router.get("/health")
async def health_check():
    """Simple health check."""
    return {"status": "ok", "service": "SOVARIS OTA Validation Platform"}
