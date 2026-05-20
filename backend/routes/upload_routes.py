"""
Upload routes — image upload and static file serving.
"""

import uuid
import shutil
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse

from config import UPLOADS_DIR
from auth import require_admin

router = APIRouter(prefix="/api")

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin),
):
    """Upload an image file. Admin only."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Sadece resim dosyaları yüklenebilir")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Geçersiz dosya uzantısı")

    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {"path": filename}


@router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve an uploaded file."""
    filepath = UPLOADS_DIR / filename
    if not filepath.exists() or not filepath.is_file():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")

    # Determine content type from extension
    ext = filepath.suffix.lower()
    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = content_types.get(ext, "application/octet-stream")
    return FileResponse(filepath, media_type=media_type)
