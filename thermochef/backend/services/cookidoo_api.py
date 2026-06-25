"""
Cookidoo Integration Service
============================
APPROACH USED: Option B (JSON Export) + Option A (Reverse-engineered API)

The official Cookidoo API is not publicly documented. This module implements:
1. Primary: Export recipes as Thermomix-compatible JSON packages (.zip)
   that can be imported via Cookidoo "My Recipes" import feature.
2. Secondary: Attempt to use the reverse-engineered Cookidoo API
   (based on community research at github.com/miaucl/cookidoo-api).

Token storage: ~/.thermochef/config.json
"""
import json
import os
import io
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional
import httpx

CONFIG_PATH = Path.home() / ".thermochef" / "config.json"
COOKIDOO_API_BASE = "https://ch.tmmobile.vorwerk-digital.com"
TOKEN_ENDPOINT = "https://sso.vorwerk.com/oauth/token"

# Country-to-subdomain mapping
COUNTRY_SUBDOMAINS = {
    "HR": "hr", "DE": "de", "AT": "at", "CH": "ch",
    "GB": "gb", "US": "us", "FR": "fr", "IT": "it",
    "ES": "es", "PT": "pt", "NL": "nl", "BE": "be",
    "PL": "pl", "CZ": "cz", "SK": "sk", "HU": "hu",
}


def load_config() -> dict:
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_config(data: dict):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def get_stored_tokens() -> Optional[dict]:
    cfg = load_config()
    return cfg.get("cookidoo_tokens")


async def authenticate(email: str, password: str, country: str = "HR", language: str = "hr-HR") -> dict:
    """
    Authenticate with Cookidoo using OAuth2 resource owner password flow.
    This uses the reverse-engineered token endpoint from the Cookidoo mobile app.
    """
    subdomain = COUNTRY_SUBDOMAINS.get(country.upper(), "hr")
    client_id = os.getenv("COOKIDOO_CLIENT_ID", "C01M001-ANDROID-APP-ANDROID")

    payload = {
        "grant_type": "password",
        "client_id": client_id,
        "username": email,
        "password": password,
        "scope": "openid profile email",
        "country": country.upper(),
        "language": language,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(TOKEN_ENDPOINT, data=payload)
            if resp.status_code == 200:
                token_data = resp.json()
                tokens = {
                    "access_token": token_data.get("access_token"),
                    "refresh_token": token_data.get("refresh_token"),
                    "expires_in": token_data.get("expires_in", 3600),
                    "country": country,
                    "language": language,
                    "subdomain": subdomain,
                    "email": email,
                    "obtained_at": datetime.now(timezone.utc).isoformat(),
                }
                cfg = load_config()
                cfg["cookidoo_tokens"] = tokens
                save_config(cfg)
                return {"success": True, "tokens": tokens}
            else:
                return {
                    "success": False,
                    "error": f"Authentication failed: HTTP {resp.status_code}",
                    "detail": resp.text[:500],
                }
    except Exception as e:
        return {"success": False, "error": str(e)}


async def test_connection() -> dict:
    """Test Cookidoo API connectivity."""
    tokens = get_stored_tokens()
    if not tokens:
        return {"connected": False, "error": "No stored credentials. Please login first."}

    try:
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        subdomain = tokens.get("subdomain", "hr")
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"https://{subdomain}.tmmobile.vorwerk-digital.com/users/current",
                headers=headers,
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"connected": True, "user": data.get("displayName", tokens.get("email"))}
            elif resp.status_code == 401:
                return {"connected": False, "error": "Token expired. Please re-login."}
            else:
                return {"connected": False, "error": f"HTTP {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def upload_recipe(recipe_data: dict) -> dict:
    """
    Upload a recipe to Cookidoo via the reverse-engineered API.
    Falls back to generating an export ZIP if API is unavailable.
    """
    tokens = get_stored_tokens()
    if not tokens:
        return {"success": False, "error": "Not authenticated. Please login to Cookidoo first."}

    try:
        cookidoo_payload = _convert_to_cookidoo_format(recipe_data)
        subdomain = tokens.get("subdomain", "hr")
        language = tokens.get("language", "hr-HR")
        headers = {
            "Authorization": f"Bearer {tokens['access_token']}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            existing_id = recipe_data.get("cookidoo_id")
            if existing_id:
                resp = await client.put(
                    f"https://{subdomain}.tmmobile.vorwerk-digital.com/created-recipes/{language}/{existing_id}",
                    json=cookidoo_payload,
                    headers=headers,
                )
            else:
                resp = await client.post(
                    f"https://{subdomain}.tmmobile.vorwerk-digital.com/created-recipes/{language}",
                    json=cookidoo_payload,
                    headers=headers,
                )

            if resp.status_code in (200, 201):
                data = resp.json()
                cookidoo_id = data.get("id") or data.get("recipeId", existing_id or "")
                return {
                    "success": True,
                    "cookidoo_id": cookidoo_id,
                    "method": "api",
                }
            else:
                return {
                    "success": False,
                    "error": f"API upload failed: HTTP {resp.status_code}",
                    "detail": resp.text[:500],
                    "suggestion": "Use 'Export ZIP' to download and manually import to Cookidoo.",
                }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "suggestion": "Use 'Export ZIP' to download and manually import to Cookidoo.",
        }


def generate_export_zip(recipe_data: dict) -> bytes:
    """
    Generate a Thermomix-compatible ZIP package for manual import to Cookidoo.
    Format based on community research of Cookidoo import format.
    """
    cookidoo_json = _convert_to_cookidoo_format(recipe_data)
    recipe_json = json.dumps(cookidoo_json, indent=2, ensure_ascii=False)

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("recipe.json", recipe_json)
        manifest = {
            "version": "1.0",
            "type": "thermomix-recipe",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "app": "ThermoChef",
        }
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))

    return buffer.getvalue()


def _convert_to_cookidoo_format(recipe: dict) -> dict:
    """Convert internal recipe format to Cookidoo API format."""
    ingredients = []
    for ing in recipe.get("ingredients", []):
        qty_str = ""
        if ing.get("quantity"):
            qty_str = str(ing["quantity"])
            if ing.get("unit"):
                qty_str += f" {ing['unit']}"
        ingredients.append({
            "name": ing.get("name", ""),
            "quantity": qty_str,
            "unit": ing.get("unit", ""),
            "preparationNote": ing.get("preparation_note", ""),
            "isGroupHeader": False,
        })

    steps = []
    for step in recipe.get("steps", []):
        step_obj = {
            "text": step.get("instruction", ""),
        }
        if step.get("temperature"):
            step_obj["temperature"] = step["temperature"]
        if step.get("speed"):
            step_obj["speed"] = step["speed"]
        if step.get("duration_seconds"):
            mins = step["duration_seconds"] // 60
            secs = step["duration_seconds"] % 60
            step_obj["duration"] = f"{mins:02d}:{secs:02d}"
        if step.get("accessory"):
            step_obj["accessory"] = step["accessory"]
        steps.append(step_obj)

    return {
        "title": recipe.get("title", ""),
        "description": recipe.get("description", ""),
        "servings": recipe.get("servings", 4),
        "preparationTime": recipe.get("prep_time", 0),
        "cookingTime": recipe.get("cook_time", 0),
        "difficulty": recipe.get("difficulty", "medium"),
        "sourceUrl": recipe.get("source_url", ""),
        "imageUrl": recipe.get("image_url", ""),
        "categories": [t.get("name", t) if isinstance(t, dict) else t for t in recipe.get("tags", [])],
        "ingredients": ingredients,
        "steps": steps,
        "isPublic": False,
    }
