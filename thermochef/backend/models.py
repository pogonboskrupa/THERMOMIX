from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


def utcnow():
    return datetime.now(timezone.utc)


recipe_tags = Table(
    "recipe_tags",
    Base.metadata,
    Column("recipe_id", Integer, ForeignKey("recipes.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    recipes = relationship(
        "Recipe",
        secondary=recipe_tags,
        back_populates="tags",
        lazy="selectin",
    )


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(600), unique=True, nullable=False)
    description = Column(Text, default="")
    source_url = Column(String(2000), default="")
    image_url = Column(String(2000), default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    servings = Column(Integer, default=4)
    prep_time = Column(Integer, default=0)
    cook_time = Column(Integer, default=0)
    difficulty = Column(String(20), default="medium")
    language = Column(String(10), default="hr")
    cookidoo_id = Column(String(200), default="")
    cookidoo_synced_at = Column(DateTime(timezone=True), nullable=True)
    cookidoo_sync_status = Column(String(20), default="pending")

    ingredients = relationship(
        "Ingredient",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Ingredient.order_idx",
        lazy="selectin",
    )
    steps = relationship(
        "Step",
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="Step.order_idx",
        lazy="selectin",
    )
    tags = relationship(
        "Tag",
        secondary=recipe_tags,
        back_populates="recipes",
        lazy="selectin",
    )
    import_logs = relationship(
        "ImportLog",
        back_populates="recipe",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    order_idx = Column(Integer, default=0)
    name = Column(String(500), nullable=False)
    quantity = Column(String(100), default="")
    unit = Column(String(100), default="")
    preparation_note = Column(String(500), default="")

    recipe = relationship("Recipe", back_populates="ingredients", lazy="selectin")


class Step(Base):
    __tablename__ = "steps"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False)
    order_idx = Column(Integer, default=0)
    instruction = Column(Text, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    temperature = Column(String(20), nullable=True)
    speed = Column(String(20), nullable=True)
    accessory = Column(String(100), nullable=True)

    recipe = relationship("Recipe", back_populates="steps", lazy="selectin")


class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=True)
    import_type = Column(String(20), nullable=False)
    source = Column(String(2000), default="")
    status = Column(String(20), default="success")
    error_message = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow)

    recipe = relationship("Recipe", back_populates="import_logs", lazy="selectin")


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(200), unique=True, nullable=False)
    value = Column(Text, default="")
