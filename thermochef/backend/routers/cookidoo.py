from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone

from database import get_db
from models import Recipe, Ingredient, Step, Tag
from schemas import CookidooAuthRequest, CookidooSyncRequest
from services import cookidoo_api

router = APIRouter(prefix="/api/cookidoo", tags=["cookidoo"])


@router.post("/auth")
async def authenticate(request: CookidooAuthRequest):
    """Login to Cookidoo and store tokens."""
    result = await cookidoo_api.authenticate(
        email=request.email,
        password=request.password,
        country=request.country,
        language=request.language,
    )
    if result["success"]:
        return {"success": True, "message": "Successfully authenticated with Cookidoo"}
    raise HTTPException(status_code=401, detail=result.get("error", "Authentication failed"))


@router.get("/status")
async def get_connection_status():
    """Check Cookidoo connection status."""
    result = await cookidoo_api.test_connection()
    return result


@router.post("/logout")
async def logout():
    """Clear stored Cookidoo credentials."""
    cfg = cookidoo_api.load_config()
    cfg.pop("cookidoo_tokens", None)
    cookidoo_api.save_config(cfg)
    return {"success": True, "message": "Logged out from Cookidoo"}


@router.post("/sync/{recipe_id}")
async def sync_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    """Sync a single recipe to Cookidoo."""
    recipe = await _load_recipe_full(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe_dict = _recipe_to_dict(recipe)
    result = await cookidoo_api.upload_recipe(recipe_dict)

    if result["success"]:
        recipe.cookidoo_id = result.get("cookidoo_id", recipe.cookidoo_id)
        recipe.cookidoo_synced_at = datetime.now(timezone.utc)
        recipe.cookidoo_sync_status = "synced"
    else:
        recipe.cookidoo_sync_status = "error"

    await db.commit()
    return result


@router.post("/sync-bulk")
async def sync_bulk(request: CookidooSyncRequest, db: AsyncSession = Depends(get_db)):
    """Sync multiple recipes to Cookidoo."""
    if request.recipe_ids:
        result = await db.execute(
            select(Recipe).where(Recipe.id.in_(request.recipe_ids)).options(
                selectinload(Recipe.ingredients),
                selectinload(Recipe.steps),
                selectinload(Recipe.tags),
            )
        )
    else:
        result = await db.execute(
            select(Recipe).where(Recipe.cookidoo_sync_status.in_(["pending", "error"])).options(
                selectinload(Recipe.ingredients),
                selectinload(Recipe.steps),
                selectinload(Recipe.tags),
            )
        )

    recipes = result.scalars().all()
    results = []

    for recipe in recipes:
        recipe_dict = _recipe_to_dict(recipe)
        sync_result = await cookidoo_api.upload_recipe(recipe_dict)

        if sync_result["success"]:
            recipe.cookidoo_id = sync_result.get("cookidoo_id", recipe.cookidoo_id)
            recipe.cookidoo_synced_at = datetime.now(timezone.utc)
            recipe.cookidoo_sync_status = "synced"
        else:
            recipe.cookidoo_sync_status = "error"

        results.append({
            "recipe_id": recipe.id,
            "title": recipe.title,
            **sync_result,
        })

    await db.commit()
    return {"results": results}


@router.get("/export/{recipe_id}")
async def export_recipe_zip(recipe_id: int, db: AsyncSession = Depends(get_db)):
    """Export recipe as Thermomix-compatible ZIP for manual Cookidoo import."""
    recipe = await _load_recipe_full(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe_dict = _recipe_to_dict(recipe)
    zip_data = cookidoo_api.generate_export_zip(recipe_dict)

    safe_title = "".join(c for c in recipe.title if c.isalnum() or c in " -_")[:50]
    filename = f"{safe_title or 'recipe'}.zip"

    return Response(
        content=zip_data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/tokens")
async def get_token_info():
    """Get info about stored Cookidoo tokens (no secrets returned)."""
    tokens = cookidoo_api.get_stored_tokens()
    if not tokens:
        return {"has_tokens": False}
    return {
        "has_tokens": True,
        "email": tokens.get("email"),
        "country": tokens.get("country"),
        "language": tokens.get("language"),
        "obtained_at": tokens.get("obtained_at"),
    }


async def _load_recipe_full(db: AsyncSession, recipe_id: int):
    result = await db.execute(
        select(Recipe)
        .where(Recipe.id == recipe_id)
        .options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.tags),
        )
    )
    return result.scalar_one_or_none()


def _recipe_to_dict(recipe: Recipe) -> dict:
    return {
        "id": recipe.id,
        "title": recipe.title,
        "description": recipe.description,
        "source_url": recipe.source_url,
        "image_url": recipe.image_url,
        "servings": recipe.servings,
        "prep_time": recipe.prep_time,
        "cook_time": recipe.cook_time,
        "difficulty": recipe.difficulty,
        "cookidoo_id": recipe.cookidoo_id,
        "ingredients": [
            {
                "order_idx": i.order_idx,
                "name": i.name,
                "quantity": i.quantity,
                "unit": i.unit,
                "preparation_note": i.preparation_note,
            }
            for i in recipe.ingredients
        ],
        "steps": [
            {
                "order_idx": s.order_idx,
                "instruction": s.instruction,
                "duration_seconds": s.duration_seconds,
                "temperature": s.temperature,
                "speed": s.speed,
                "accessory": s.accessory,
            }
            for s in recipe.steps
        ],
        "tags": [{"name": t.name} for t in recipe.tags],
    }
