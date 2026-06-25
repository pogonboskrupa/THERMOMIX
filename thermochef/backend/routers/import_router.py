from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
import json

from database import get_db
from models import ImportLog, Recipe
from schemas import URLImportRequest, ScrapedRecipePreview, RecipeCreate
from services.scraper import scrape_recipe
from services.ocr import extract_recipe_from_image
from routers.recipes import create_recipe as _create_recipe

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/url", response_model=ScrapedRecipePreview)
async def import_from_url(
    request: URLImportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Scrape recipe from URL and return preview (or save directly)."""
    log = ImportLog(import_type="url", source=request.url, status="pending")
    db.add(log)
    await db.flush()

    try:
        data = await scrape_recipe(request.url)
        log.status = "success"

        if request.save:
            recipe_data = RecipeCreate(**data)
            saved = await _create_recipe(recipe_data, db)
            log.recipe_id = saved.id

        await db.commit()
        return ScrapedRecipePreview(**data)

    except Exception as e:
        log.status = "error"
        log.error_message = str(e)[:1000]
        await db.commit()
        raise HTTPException(status_code=422, detail=f"Failed to scrape URL: {str(e)}")


@router.post("/ocr", response_model=ScrapedRecipePreview)
async def import_from_image(
    file: UploadFile = File(...),
    save: bool = Form(False),
    db: AsyncSession = Depends(get_db),
):
    """Extract recipe from uploaded image using Claude Vision API."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    max_size = 10 * 1024 * 1024  # 10MB
    image_data = await file.read()
    if len(image_data) > max_size:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    log = ImportLog(import_type="ocr", source=file.filename or "uploaded_image", status="pending")
    db.add(log)
    await db.flush()

    try:
        data = await extract_recipe_from_image(image_data, file.content_type)
        log.status = "success"

        if save:
            recipe_data = RecipeCreate(**data)
            saved = await _create_recipe(recipe_data, db)
            log.recipe_id = saved.id

        await db.commit()
        return ScrapedRecipePreview(**data)

    except Exception as e:
        log.status = "error"
        log.error_message = str(e)[:1000]
        await db.commit()
        raise HTTPException(status_code=422, detail=f"OCR extraction failed: {str(e)}")


@router.get("/history")
async def get_import_history(db: AsyncSession = Depends(get_db)):
    """Get import history log."""
    result = await db.execute(
        select(ImportLog).order_by(ImportLog.created_at.desc()).limit(100)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "recipe_id": log.recipe_id,
            "import_type": log.import_type,
            "source": log.source,
            "status": log.status,
            "error_message": log.error_message,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
