from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from slugify import slugify
from datetime import datetime, timezone

from database import get_db
from models import Recipe, Ingredient, Step, Tag, recipe_tags
from schemas import RecipeCreate, RecipeUpdate, RecipeSchema, RecipeListSchema

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


async def get_or_create_tag(db: AsyncSession, name: str) -> Tag:
    result = await db.execute(select(Tag).where(Tag.name == name))
    tag = result.scalar_one_or_none()
    if not tag:
        tag = Tag(name=name)
        db.add(tag)
        await db.flush()
    return tag


async def make_unique_slug(db: AsyncSession, title: str, exclude_id: Optional[int] = None) -> str:
    base = slugify(title, allow_unicode=False, max_length=200) or "recipe"
    slug = base
    counter = 1
    while True:
        q = select(Recipe).where(Recipe.slug == slug)
        if exclude_id:
            q = q.where(Recipe.id != exclude_id)
        result = await db.execute(q)
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base}-{counter}"
        counter += 1


async def _load_recipe(db: AsyncSession, recipe_id: int) -> Optional[Recipe]:
    """Load a recipe with all relationships eagerly."""
    result = await db.execute(
        select(Recipe).where(Recipe.id == recipe_id).options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.tags),
        )
    )
    return result.scalar_one_or_none()


@router.get("/tags", response_model=List[str])
async def list_tags(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag.name).order_by(Tag.name))
    return result.scalars().all()


@router.get("/", response_model=List[RecipeListSchema])
async def list_recipes(
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Recipe).options(selectinload(Recipe.tags))

    if search:
        q = q.where(
            or_(
                Recipe.title.ilike(f"%{search}%"),
                Recipe.description.ilike(f"%{search}%"),
            )
        )
    if difficulty:
        q = q.where(Recipe.difficulty == difficulty)
    if tag:
        q = q.join(Recipe.tags).where(Tag.name == tag)

    q = q.order_by(Recipe.updated_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=RecipeSchema, status_code=201)
async def create_recipe(data: RecipeCreate, db: AsyncSession = Depends(get_db)):
    slug = await make_unique_slug(db, data.title)

    recipe = Recipe(
        title=data.title,
        slug=slug,
        description=data.description,
        source_url=data.source_url,
        image_url=data.image_url,
        servings=data.servings,
        prep_time=data.prep_time,
        cook_time=data.cook_time,
        difficulty=data.difficulty,
        language=data.language,
    )
    db.add(recipe)
    await db.flush()

    for ing_data in data.ingredients:
        db.add(Ingredient(recipe_id=recipe.id, **ing_data.model_dump()))

    for step_data in data.steps:
        db.add(Step(recipe_id=recipe.id, **step_data.model_dump()))

    # Handle tags using direct association table inserts to avoid lazy loading
    tag_ids = []
    for tag_name in data.tags:
        tag = await get_or_create_tag(db, tag_name.strip())
        tag_ids.append(tag.id)

    await db.flush()

    for tag_id in tag_ids:
        await db.execute(
            recipe_tags.insert().values(recipe_id=recipe.id, tag_id=tag_id).prefix_with("OR IGNORE")
        )

    await db.commit()
    return await _load_recipe(db, recipe.id)


@router.get("/{recipe_id}", response_model=RecipeSchema)
async def get_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    recipe = await _load_recipe(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.get("/slug/{slug}", response_model=RecipeSchema)
async def get_recipe_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Recipe).where(Recipe.slug == slug).options(
            selectinload(Recipe.ingredients),
            selectinload(Recipe.steps),
            selectinload(Recipe.tags),
        )
    )
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.put("/{recipe_id}", response_model=RecipeSchema)
async def update_recipe(recipe_id: int, data: RecipeUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recipe).where(Recipe.id == recipe_id))
    recipe = result.scalar_one_or_none()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    update_fields = {
        'title': data.title,
        'description': data.description,
        'source_url': data.source_url,
        'image_url': data.image_url,
        'servings': data.servings,
        'prep_time': data.prep_time,
        'cook_time': data.cook_time,
        'difficulty': data.difficulty,
        'language': data.language,
    }
    for field, value in update_fields.items():
        if value is not None:
            setattr(recipe, field, value)

    if data.title is not None:
        recipe.slug = await make_unique_slug(db, data.title, exclude_id=recipe_id)

    recipe.updated_at = datetime.now(timezone.utc)
    recipe.cookidoo_sync_status = "pending"

    if data.ingredients is not None:
        await db.execute(delete(Ingredient).where(Ingredient.recipe_id == recipe_id))
        for ing_data in data.ingredients:
            db.add(Ingredient(recipe_id=recipe.id, **ing_data.model_dump()))

    if data.steps is not None:
        await db.execute(delete(Step).where(Step.recipe_id == recipe_id))
        for step_data in data.steps:
            db.add(Step(recipe_id=recipe.id, **step_data.model_dump()))

    if data.tags is not None:
        await db.execute(delete(recipe_tags).where(recipe_tags.c.recipe_id == recipe_id))
        for tag_name in data.tags:
            tag = await get_or_create_tag(db, tag_name.strip())
            await db.flush()
            await db.execute(
                recipe_tags.insert().values(recipe_id=recipe.id, tag_id=tag.id).prefix_with("OR IGNORE")
            )

    await db.commit()
    return await _load_recipe(db, recipe_id)


@router.delete("/{recipe_id}", status_code=204)
async def delete_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recipe.id).where(Recipe.id == recipe_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Recipe not found")
    # Delete in FK order to avoid constraint issues
    await db.execute(delete(recipe_tags).where(recipe_tags.c.recipe_id == recipe_id))
    await db.execute(delete(Ingredient).where(Ingredient.recipe_id == recipe_id))
    await db.execute(delete(Step).where(Step.recipe_id == recipe_id))
    from models import ImportLog
    await db.execute(delete(ImportLog).where(ImportLog.recipe_id == recipe_id))
    await db.execute(delete(Recipe).where(Recipe.id == recipe_id))
    await db.commit()


@router.post("/{recipe_id}/duplicate", response_model=RecipeSchema, status_code=201)
async def duplicate_recipe(recipe_id: int, db: AsyncSession = Depends(get_db)):
    original = await _load_recipe(db, recipe_id)
    if not original:
        raise HTTPException(status_code=404, detail="Recipe not found")

    new_title = f"{original.title} (kopija)"
    slug = await make_unique_slug(db, new_title)

    new_recipe = Recipe(
        title=new_title,
        slug=slug,
        description=original.description,
        source_url=original.source_url,
        image_url=original.image_url,
        servings=original.servings,
        prep_time=original.prep_time,
        cook_time=original.cook_time,
        difficulty=original.difficulty,
        language=original.language,
    )
    db.add(new_recipe)
    await db.flush()

    for ing in original.ingredients:
        db.add(Ingredient(
            recipe_id=new_recipe.id,
            order_idx=ing.order_idx,
            name=ing.name,
            quantity=ing.quantity,
            unit=ing.unit,
            preparation_note=ing.preparation_note,
        ))
    for step in original.steps:
        db.add(Step(
            recipe_id=new_recipe.id,
            order_idx=step.order_idx,
            instruction=step.instruction,
            duration_seconds=step.duration_seconds,
            temperature=step.temperature,
            speed=step.speed,
            accessory=step.accessory,
        ))

    await db.flush()
    for tag in original.tags:
        await db.execute(
            recipe_tags.insert().values(recipe_id=new_recipe.id, tag_id=tag.id).prefix_with("OR IGNORE")
        )

    await db.commit()
    return await _load_recipe(db, new_recipe.id)
