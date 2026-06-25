"""Claude Vision API OCR service for recipe image extraction."""
import base64
import json
import re
import os
from pathlib import Path
import anthropic


def _get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")
    return anthropic.Anthropic(api_key=api_key)


EXTRACTION_PROMPT = """You are a recipe extraction assistant. Analyze this image and extract the recipe information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "title": "Recipe title",
  "description": "Brief description",
  "servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "difficulty": "easy|medium|hard",
  "language": "hr|en|de|other",
  "ingredients": [
    {"order_idx": 0, "quantity": "200", "unit": "g", "name": "flour", "preparation_note": "sifted"}
  ],
  "steps": [
    {"order_idx": 0, "instruction": "Step description", "duration_seconds": null, "temperature": null, "speed": null, "accessory": null}
  ],
  "tags": ["tag1", "tag2"]
}

For Thermomix steps, fill temperature (e.g. "100", "Varoma"), speed (e.g. "5", "Turbo"), duration_seconds if mentioned.
For Croatian recipes, keep ingredient names in Croatian and set language to "hr".
If any field is not visible, use sensible defaults.
Extract ALL ingredients and steps visible in the image."""


async def extract_recipe_from_image(image_data: bytes, content_type: str) -> dict:
    """Extract recipe data from an image using Claude Vision API."""
    client = _get_client()

    # Encode image to base64
    b64_image = base64.standard_b64encode(image_data).decode("utf-8")

    # Map content type to media type
    media_type_map = {
        "image/jpeg": "image/jpeg",
        "image/jpg": "image/jpeg",
        "image/png": "image/png",
        "image/gif": "image/gif",
        "image/webp": "image/webp",
    }
    media_type = media_type_map.get(content_type.lower(), "image/jpeg")

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": b64_image,
                        },
                    },
                    {
                        "type": "text",
                        "text": EXTRACTION_PROMPT,
                    },
                ],
            }
        ],
    )

    response_text = message.content[0].text.strip()

    # Strip markdown code fences if present
    if response_text.startswith("```"):
        response_text = re.sub(r"^```(?:json)?\n?", "", response_text)
        response_text = re.sub(r"\n?```$", "", response_text)

    data = json.loads(response_text)

    # Ensure required structure
    return {
        "title": data.get("title", "Untitled Recipe"),
        "description": data.get("description", ""),
        "source_url": "",
        "image_url": "",
        "servings": int(data.get("servings", 4)),
        "prep_time": int(data.get("prep_time", 0)),
        "cook_time": int(data.get("cook_time", 0)),
        "difficulty": data.get("difficulty", "medium"),
        "language": data.get("language", "hr"),
        "ingredients": [
            {
                "order_idx": i.get("order_idx", idx),
                "quantity": str(i.get("quantity", "")),
                "unit": str(i.get("unit", "")),
                "name": str(i.get("name", "")),
                "preparation_note": str(i.get("preparation_note", "")),
            }
            for idx, i in enumerate(data.get("ingredients", []))
        ],
        "steps": [
            {
                "order_idx": s.get("order_idx", idx),
                "instruction": str(s.get("instruction", "")),
                "duration_seconds": s.get("duration_seconds"),
                "temperature": s.get("temperature"),
                "speed": s.get("speed"),
                "accessory": s.get("accessory"),
            }
            for idx, s in enumerate(data.get("steps", []))
        ],
        "tags": data.get("tags", []),
    }
