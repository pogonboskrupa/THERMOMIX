from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from datetime import datetime

from database import get_db
from models import Recipe, Ingredient, Step, Tag, AppSettings
from sqlalchemy.orm import selectinload
from schemas import SettingUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = {
    "language": "hr",
    "scraper_timeout": "30",
    "theme": "light",
}


@router.get("/")
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    """Get all app settings."""
    result = await db.execute(select(AppSettings))
    rows = result.scalars().all()
    settings = dict(DEFAULT_SETTINGS)
    for row in rows:
        settings[row.key] = row.value
    return settings


@router.put("/{key}")
async def update_setting(key: str, data: SettingUpdate, db: AsyncSession = Depends(get_db)):
    """Update a single setting."""
    result = await db.execute(select(AppSettings).where(AppSettings.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = data.value
    else:
        setting = AppSettings(key=key, value=data.value)
        db.add(setting)
    await db.commit()
    return {"key": key, "value": data.value}


@router.get("/export/json")
async def export_database(db: AsyncSession = Depends(get_db)):
    """Export all recipes as JSON backup."""
    result = await db.execute(
        select(Recipe).options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.tags),
        ).order_by(Recipe.created_at)
    )
    recipes = result.scalars().all()

    export_data = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "version": "1.0",
        "app": "ThermoChef",
        "recipes": [
            {
                "title": r.title,
                "slug": r.slug,
                "description": r.description,
                "source_url": r.source_url,
                "image_url": r.image_url,
                "servings": r.servings,
                "prep_time": r.prep_time,
                "cook_time": r.cook_time,
                "difficulty": r.difficulty,
                "language": r.language,
                "cookidoo_id": r.cookidoo_id,
                "cookidoo_sync_status": r.cookidoo_sync_status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                "tags": [t.name for t in r.tags],
                "ingredients": [
                    {
                        "order_idx": i.order_idx,
                        "name": i.name,
                        "quantity": i.quantity,
                        "unit": i.unit,
                        "preparation_note": i.preparation_note,
                    }
                    for i in r.ingredients
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
                    for s in r.steps
                ],
            }
            for r in recipes
        ],
    }

    json_bytes = json.dumps(export_data, indent=2, ensure_ascii=False).encode("utf-8")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="thermochef_backup_{timestamp}.json"'},
    )
