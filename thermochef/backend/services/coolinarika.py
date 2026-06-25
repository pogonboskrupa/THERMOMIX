"""Coolinarika.com (Croatian recipe site) specific scraper."""
import re
import json
import httpx
from bs4 import BeautifulSoup
from typing import Optional


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "hr-HR,hr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
}


def parse_time_to_minutes(time_str: str) -> int:
    """Parse Croatian time strings like '30 min', '1 h 30 min' to minutes."""
    if not time_str:
        return 0
    total = 0
    h = re.search(r'(\d+)\s*h', time_str)
    m = re.search(r'(\d+)\s*min', time_str)
    if h:
        total += int(h.group(1)) * 60
    if m:
        total += int(m.group(1))
    return total


def parse_servings(text: str) -> int:
    """Extract number of servings from Croatian text."""
    m = re.search(r'(\d+)', text or "")
    return int(m.group(1)) if m else 4


async def scrape_coolinarika(url: str) -> dict:
    """Scrape a recipe from coolinarika.com."""
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "lxml")

    result = {
        "title": "",
        "description": "",
        "source_url": url,
        "image_url": "",
        "servings": 4,
        "prep_time": 0,
        "cook_time": 0,
        "difficulty": "medium",
        "language": "hr",
        "ingredients": [],
        "steps": [],
        "tags": [],
    }

    # Try JSON-LD structured data first
    json_ld = soup.find("script", type="application/ld+json")
    if json_ld:
        try:
            data = json.loads(json_ld.string)
            if isinstance(data, list):
                data = next((d for d in data if d.get("@type") == "Recipe"), data[0] if data else {})

            if data.get("@type") == "Recipe":
                result["title"] = data.get("name", "")
                result["description"] = data.get("description", "")

                # Image
                img = data.get("image")
                if isinstance(img, list):
                    img = img[0]
                if isinstance(img, dict):
                    img = img.get("url", "")
                result["image_url"] = img or ""

                # Servings
                yield_data = data.get("recipeYield", "")
                if yield_data:
                    result["servings"] = parse_servings(str(yield_data))

                # Times
                prep = data.get("prepTime", "")
                cook = data.get("cookTime", "")
                total = data.get("totalTime", "")
                if prep:
                    result["prep_time"] = _parse_iso_duration(prep)
                if cook:
                    result["cook_time"] = _parse_iso_duration(cook)

                # Ingredients
                for idx, ing in enumerate(data.get("recipeIngredient", [])):
                    parsed = _parse_ingredient_line(ing)
                    parsed["order_idx"] = idx
                    result["ingredients"].append(parsed)

                # Steps
                for idx, step in enumerate(data.get("recipeInstructions", [])):
                    text = step.get("text", "") if isinstance(step, dict) else str(step)
                    result["steps"].append({
                        "order_idx": idx,
                        "instruction": text.strip(),
                        "duration_seconds": None,
                        "temperature": None,
                        "speed": None,
                        "accessory": None,
                    })

                # Tags / categories
                keywords = data.get("keywords", "")
                if keywords:
                    if isinstance(keywords, list):
                        result["tags"] = [str(k).strip() for k in keywords if str(k).strip()]
                    else:
                        result["tags"] = [k.strip() for k in str(keywords).split(",") if k.strip()]
                category = data.get("recipeCategory", "")
                if category:
                    cats = category if isinstance(category, list) else [category]
                    for c in cats:
                        if c and c not in result["tags"]:
                            result["tags"].append(c)

                # Difficulty from aggregateRating or custom field
                if not result["title"]:
                    pass
                else:
                    return result
        except (json.JSONDecodeError, KeyError, TypeError):
            pass

    # Fallback: HTML scraping for Coolinarika
    _scrape_coolinarika_html(soup, result)
    return result


def _scrape_coolinarika_html(soup: BeautifulSoup, result: dict):
    """Fallback HTML scraping for Coolinarika."""
    # Title
    title_el = (
        soup.find("h1", class_=re.compile(r"recipe.*title|title.*recipe", re.I))
        or soup.find("h1", itemprop="name")
        or soup.find("h1")
    )
    if title_el:
        result["title"] = title_el.get_text(strip=True)

    # Description
    desc_el = soup.find(itemprop="description") or soup.find("div", class_=re.compile(r"description|intro", re.I))
    if desc_el:
        result["description"] = desc_el.get_text(strip=True)

    # Image
    img_el = soup.find("img", itemprop="image") or soup.find("img", class_=re.compile(r"recipe.*image|hero", re.I))
    if img_el:
        result["image_url"] = img_el.get("src", "") or img_el.get("data-src", "")

    # Servings
    servings_el = soup.find(itemprop="recipeYield") or soup.find(string=re.compile(r'porcij|osoba|komad', re.I))
    if servings_el:
        result["servings"] = parse_servings(str(servings_el))

    # Ingredients
    ing_container = (
        soup.find("ul", itemprop="recipeIngredient")
        or soup.find("div", class_=re.compile(r"ingredient", re.I))
        or soup.find("ul", class_=re.compile(r"ingredient", re.I))
    )
    if ing_container:
        for idx, li in enumerate(ing_container.find_all(["li", "span"], recursive=True)):
            text = li.get_text(strip=True)
            if text and len(text) > 2:
                parsed = _parse_ingredient_line(text)
                parsed["order_idx"] = idx
                result["ingredients"].append(parsed)

    # Steps
    steps_container = (
        soup.find(itemprop="recipeInstructions")
        or soup.find("ol", class_=re.compile(r"step|instruction|upute", re.I))
        or soup.find("div", class_=re.compile(r"step|instruction|preparation", re.I))
    )
    if steps_container:
        items = steps_container.find_all(["li", "p"])
        for idx, item in enumerate(items):
            text = item.get_text(strip=True)
            if text and len(text) > 5:
                result["steps"].append({
                    "order_idx": idx,
                    "instruction": text,
                    "duration_seconds": None,
                    "temperature": None,
                    "speed": None,
                    "accessory": None,
                })


def _parse_iso_duration(duration: str) -> int:
    """Parse ISO 8601 duration like PT30M, PT1H30M to minutes."""
    if not duration:
        return 0
    h = re.search(r'(\d+)H', duration)
    m = re.search(r'(\d+)M', duration)
    total = 0
    if h:
        total += int(h.group(1)) * 60
    if m:
        total += int(m.group(1))
    return total


def _parse_ingredient_line(text: str) -> dict:
    """Parse an ingredient line into qty/unit/name."""
    text = text.strip()
    # Croatian units
    units = [
        "kg", "g", "dag", "mg",
        "l", "dl", "ml",
        "žlica", "žlice", "žlicu", "žl",
        "žličica", "žličice", "žličicu", "žličica",
        "šalica", "šalice", "šalicu",
        "kom", "komada",
        "prstohvat", "prstohvata",
        "grančica", "grančice",
        "list", "lista", "listova",
        "tbsp", "tsp", "cup", "oz", "lb", "fl oz",
    ]
    units_pattern = "|".join(re.escape(u) for u in sorted(units, key=len, reverse=True))

    m = re.match(
        rf'^(\d+[.,]?\d*(?:\s*[-–]\s*\d+[.,]?\d*)?)\s*({units_pattern})?\s*(.+)',
        text, re.IGNORECASE | re.UNICODE
    )
    if m:
        return {
            "quantity": m.group(1).strip(),
            "unit": (m.group(2) or "").strip(),
            "name": m.group(3).strip(),
            "preparation_note": "",
            "order_idx": 0,
        }
    return {"quantity": "", "unit": "", "name": text, "preparation_note": "", "order_idx": 0}
