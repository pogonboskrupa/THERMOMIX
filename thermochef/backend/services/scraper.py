"""General-purpose recipe scraper with Coolinarika special handling."""
import re
import json
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from typing import Optional
from services.coolinarika import scrape_coolinarika, _parse_ingredient_line, _parse_iso_duration


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
}


async def scrape_recipe(url: str) -> dict:
    """Scrape recipe from any URL, with Coolinarika special handling."""
    domain = urlparse(url).netloc.lower()
    if "coolinarika" in domain:
        return await scrape_coolinarika(url)
    return await _scrape_generic(url)


async def _scrape_generic(url: str) -> dict:
    """Generic recipe scraper using JSON-LD + HTML fallback."""
    html = await _fetch_html(url)
    soup = BeautifulSoup(html, "lxml")

    result = {
        "title": "",
        "description": "",
        "source_url": url,
        "image_url": "",
        "servings": 4,
        "prep_time": 0,
        "cook_time": 0,
        "difficulty": "medium",
        "language": "en",
        "ingredients": [],
        "steps": [],
        "tags": [],
    }

    # Try JSON-LD first
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            recipe_data = _find_recipe_in_jsonld(data)
            if recipe_data:
                _extract_from_jsonld(recipe_data, result)
                if result["title"]:
                    return result
        except (json.JSONDecodeError, TypeError):
            continue

    # HTML fallback
    _extract_from_html(soup, result, url)
    return result


def _find_recipe_in_jsonld(data) -> Optional[dict]:
    """Recursively find Recipe type in JSON-LD data."""
    if isinstance(data, dict):
        if data.get("@type") == "Recipe":
            return data
        if isinstance(data.get("@type"), list) and "Recipe" in data["@type"]:
            return data
        for v in data.values():
            found = _find_recipe_in_jsonld(v)
            if found:
                return found
    elif isinstance(data, list):
        for item in data:
            found = _find_recipe_in_jsonld(item)
            if found:
                return found
    return None


def _extract_from_jsonld(data: dict, result: dict):
    """Extract recipe fields from JSON-LD Recipe object."""
    result["title"] = data.get("name", "")
    result["description"] = _strip_html(data.get("description", ""))

    img = data.get("image")
    if isinstance(img, list) and img:
        img = img[0]
    if isinstance(img, dict):
        img = img.get("url", "")
    result["image_url"] = img or ""

    yield_val = data.get("recipeYield", "")
    if yield_val:
        m = re.search(r'\d+', str(yield_val))
        result["servings"] = int(m.group()) if m else 4

    result["prep_time"] = _parse_iso_duration(data.get("prepTime", ""))
    result["cook_time"] = _parse_iso_duration(data.get("cookTime", ""))

    for idx, ing in enumerate(data.get("recipeIngredient", [])):
        parsed = _parse_ingredient_line(str(ing))
        parsed["order_idx"] = idx
        result["ingredients"].append(parsed)

    instructions = data.get("recipeInstructions", [])
    for idx, step in enumerate(instructions):
        if isinstance(step, dict):
            text = step.get("text", step.get("name", ""))
        else:
            text = str(step)
        if text.strip():
            result["steps"].append({
                "order_idx": idx,
                "instruction": _strip_html(text).strip(),
                "duration_seconds": None,
                "temperature": None,
                "speed": None,
                "accessory": None,
            })

    keywords = data.get("keywords", "")
    if keywords:
        if isinstance(keywords, list):
            result["tags"] = [str(k).strip() for k in keywords if str(k).strip()]
        else:
            result["tags"] = [k.strip() for k in re.split(r"[,;]", str(keywords)) if k.strip()]
    category = data.get("recipeCategory", "")
    if category:
        cats = category if isinstance(category, list) else [category]
        for c in cats:
            c = str(c).strip()
            if c and c not in result["tags"]:
                result["tags"].append(c)

    # Difficulty from suitableForDiet or custom
    suitable = data.get("recipeDifficulty", data.get("difficulty", ""))
    if suitable:
        result["difficulty"] = suitable.lower()


def _extract_from_html(soup: BeautifulSoup, result: dict, url: str):
    """Fallback HTML extraction using common patterns."""
    # Title
    for sel in ["h1[itemprop='name']", "h1.recipe-title", "h1.wprm-recipe-name", "h1"]:
        el = soup.select_one(sel)
        if el:
            result["title"] = el.get_text(strip=True)
            break

    # Description
    for sel in ["div[itemprop='description']", "p.recipe-description", "div.wprm-recipe-summary"]:
        el = soup.select_one(sel)
        if el:
            result["description"] = el.get_text(strip=True)
            break

    # Image - look for og:image meta tag first
    og_img = soup.find("meta", property="og:image")
    if og_img:
        result["image_url"] = og_img.get("content", "")
    else:
        img = soup.find("img", class_=re.compile(r"recipe|hero|featured", re.I))
        if img:
            result["image_url"] = img.get("src", "")

    # Ingredients
    ing_patterns = [
        "ul[itemprop='recipeIngredient'] li",
        "li[itemprop='recipeIngredient']",
        "div.wprm-recipe-ingredient",
        "li.ingredient",
        "div.ingredients li",
    ]
    for sel in ing_patterns:
        items = soup.select(sel)
        if items:
            for idx, el in enumerate(items):
                text = el.get_text(strip=True)
                if text:
                    parsed = _parse_ingredient_line(text)
                    parsed["order_idx"] = idx
                    result["ingredients"].append(parsed)
            break

    # Steps
    step_patterns = [
        "div[itemprop='recipeInstructions'] li",
        "li[itemprop='recipeInstructions']",
        "div.wprm-recipe-instruction-text",
        "div.step-instructions p",
        "div.instructions li",
        "ol.steps li",
    ]
    for sel in step_patterns:
        items = soup.select(sel)
        if items:
            for idx, el in enumerate(items):
                text = el.get_text(strip=True)
                if text and len(text) > 5:
                    result["steps"].append({
                        "order_idx": idx,
                        "instruction": text,
                        "duration_seconds": None,
                        "temperature": None,
                        "speed": None,
                        "accessory": None,
                    })
            break


async def _fetch_html(url: str) -> str:
    """Fetch HTML, with optional playwright fallback for JS-heavy sites."""
    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text
    except Exception:
        return await _fetch_with_playwright(url)


async def _fetch_with_playwright(url: str) -> str:
    """Use Playwright to render JS-heavy pages."""
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=30000)
            html = await page.content()
            await browser.close()
            return html
    except Exception as e:
        raise RuntimeError(f"Both requests and playwright failed: {e}")


def _strip_html(text: str) -> str:
    """Remove HTML tags from string."""
    return re.sub(r"<[^>]+>", " ", text or "").strip()
