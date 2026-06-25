from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime


class TagSchema(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class IngredientBase(BaseModel):
    order_idx: int = 0
    name: str
    quantity: str = ""
    unit: str = ""
    preparation_note: str = ""

    @field_validator('quantity', 'unit', 'preparation_note', mode='before')
    @classmethod
    def none_to_str(cls, v):
        return v if v is not None else ""


class IngredientCreate(IngredientBase):
    pass


class IngredientSchema(IngredientBase):
    id: int
    recipe_id: int

    model_config = {"from_attributes": True}


class StepBase(BaseModel):
    order_idx: int = 0
    instruction: str
    duration_seconds: Optional[int] = None
    temperature: Optional[str] = None
    speed: Optional[str] = None
    accessory: Optional[str] = None

    @field_validator('temperature', 'speed', 'accessory', mode='before')
    @classmethod
    def coerce_to_str(cls, v):
        if v is None:
            return None
        return str(v)

    @field_validator('duration_seconds', mode='before')
    @classmethod
    def coerce_duration(cls, v):
        if v is None:
            return None
        try:
            return int(float(v))
        except (ValueError, TypeError):
            return None


class StepCreate(StepBase):
    pass


class StepSchema(StepBase):
    id: int
    recipe_id: int

    model_config = {"from_attributes": True}


class RecipeBase(BaseModel):
    title: str
    description: str = ""
    source_url: str = ""
    image_url: str = ""
    servings: int = 4
    prep_time: int = 0
    cook_time: int = 0
    difficulty: str = "medium"
    language: str = "hr"

    @field_validator('description', 'source_url', 'image_url', 'language', mode='before')
    @classmethod
    def none_to_str(cls, v):
        return v if v is not None else ""


class RecipeCreate(RecipeBase):
    ingredients: List[IngredientCreate] = []
    steps: List[StepCreate] = []
    tags: List[str] = []


class RecipeUpdate(RecipeBase):
    title: Optional[str] = None
    ingredients: Optional[List[IngredientCreate]] = None
    steps: Optional[List[StepCreate]] = None
    tags: Optional[List[str]] = None


class RecipeSchema(RecipeBase):
    id: int
    slug: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    cookidoo_id: str = ""
    cookidoo_synced_at: Optional[datetime] = None
    cookidoo_sync_status: str = "not_synced"
    ingredients: List[IngredientSchema] = []
    steps: List[StepSchema] = []
    tags: List[TagSchema] = []

    @field_validator('cookidoo_id', 'cookidoo_sync_status', mode='before')
    @classmethod
    def none_to_str(cls, v):
        return v if v is not None else ""

    model_config = {"from_attributes": True}


class RecipeListSchema(RecipeBase):
    id: int
    slug: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    cookidoo_id: str = ""
    cookidoo_sync_status: str = "not_synced"
    tags: List[TagSchema] = []

    @field_validator('cookidoo_id', 'cookidoo_sync_status', mode='before')
    @classmethod
    def none_to_str(cls, v):
        return v if v is not None else ""

    model_config = {"from_attributes": True}


class ImportLogSchema(BaseModel):
    id: int
    recipe_id: Optional[int]
    import_type: str
    source: str
    status: str
    error_message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class URLImportRequest(BaseModel):
    url: str
    save: bool = False


class OCRImportRequest(BaseModel):
    save: bool = False


class CookidooAuthRequest(BaseModel):
    email: str
    password: str
    country: str = "HR"
    language: str = "hr-HR"


class CookidooSyncRequest(BaseModel):
    recipe_ids: Optional[List[int]] = None


class SettingUpdate(BaseModel):
    value: str


class ScrapedRecipePreview(BaseModel):
    title: str
    description: str = ""
    source_url: str = ""
    image_url: str = ""
    servings: int = 4
    prep_time: int = 0
    cook_time: int = 0
    difficulty: str = "medium"
    language: str = "hr"
    ingredients: List[IngredientCreate] = []
    steps: List[StepCreate] = []
    tags: List[str] = []
