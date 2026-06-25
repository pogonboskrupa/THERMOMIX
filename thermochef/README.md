# ThermoChef 🍳

Thermomix recipe manager with Cookidoo integration. Import recipes from URLs (Coolinarika, AllRecipes), photos via AI-powered OCR, or create them manually with full Thermomix step fields (temperature, speed, duration, accessory).

---

## Quick Start

```bash
# 1. Clone and enter directory
cd thermochef

# 2. Copy and configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Start everything
./start.sh
```

Open **http://localhost:5173** in your browser.

---

## Features

| Feature | Description |
|---|---|
| **URL Import** | Paste any recipe URL — auto-extracts title, ingredients, steps |
| **Coolinarika.com** | Special handler for Croatian recipes (UTF-8, Croatian units) |
| **Photo/OCR** | Upload a photo of a recipe — Claude Vision extracts it |
| **Manual Entry** | Full recipe form with drag-and-drop reordering |
| **Thermomix Steps** | Temperature (°C/Varoma), Speed (0.5–10/Turbo/Reverse), Duration, Accessory |
| **Cookidoo Sync** | Upload recipes to Cookidoo (uses reverse-engineered API) |
| **ZIP Export** | Export Thermomix-compatible .zip for manual Cookidoo import |
| **Recipe Library** | Grid/list view, search, filter by tag/difficulty |
| **JSON Backup** | Export all recipes as JSON |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
ANTHROPIC_API_KEY=your_key_here        # Required for photo OCR
COOKIDOO_CLIENT_ID=C01M001-ANDROID-APP-ANDROID  # Optional
PORT=8000
ENV=development
```

Get your Anthropic API key at: https://console.anthropic.com

---

## Project Structure

```
thermochef/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # SQLAlchemy models
│   ├── database.py          # Async SQLite setup
│   ├── schemas.py           # Pydantic schemas
│   ├── routers/
│   │   ├── recipes.py       # Recipe CRUD
│   │   ├── import_router.py # URL scraping + OCR endpoints
│   │   ├── cookidoo.py      # Cookidoo sync endpoints
│   │   └── settings.py      # App settings + DB export
│   └── services/
│       ├── scraper.py       # Generic recipe scraper
│       ├── coolinarika.py   # Coolinarika-specific scraper
│       ├── ocr.py           # Claude Vision OCR
│       └── cookidoo_api.py  # Cookidoo API + ZIP export
├── frontend/
│   └── src/
│       ├── pages/           # Library, Detail, Import, Settings
│       ├── components/      # Navigation, RecipeCard, RecipeEditor
│       └── api/client.js    # Axios API client
├── .env.example
├── docker-compose.yml
├── start.sh
└── README.md
```

---

## Docker

```bash
cp .env.example .env
# Edit .env

docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Cookidoo Integration

**Approach used: Option B (ZIP Export) + Option A (Reverse-engineered API)**

The official Cookidoo API is not publicly documented by Vorwerk. ThermoChef implements two approaches:

1. **Reverse-engineered API** (primary): Based on community research of the Cookidoo mobile app API. Login with your Cookidoo credentials, then sync recipes directly. This is unofficial and may stop working.

2. **ZIP Export** (reliable fallback): Every recipe can be exported as a `.zip` file containing a Thermomix-compatible JSON. To import:
   - Go to Cookidoo → My Recipes → Import
   - Upload the `.zip` file

Credentials are stored locally at `~/.thermochef/config.json`.

---

## Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy (async), SQLite, BeautifulSoup4, Playwright
- **Frontend**: React 19, Vite, Tailwind CSS, @dnd-kit, axios, react-hot-toast
- **AI**: Claude claude-sonnet-4-6 (Anthropic) for recipe OCR

---

## API Documentation

Interactive API docs available at http://localhost:8000/docs when running.

Key endpoints:
- `GET /api/recipes/` — list all recipes
- `POST /api/recipes/` — create recipe
- `POST /api/import/url` — import from URL
- `POST /api/import/ocr` — import from image
- `POST /api/cookidoo/sync/{id}` — sync to Cookidoo
- `GET /api/cookidoo/export/{id}` — download ZIP

---

## Croatian Units Support (Coolinarika)

The scraper handles Croatian measurement units:
- **Težina**: g, dag, kg
- **Volumen**: ml, dl, l
- **Žlice**: žlica, žlice, žličica, žličice
- **Ostalo**: kom, prstohvat, grančica, list

---

*ThermoChef is not affiliated with Vorwerk or Cookidoo®.*

---

# Hrvatski / Croatian

## Brzi start

```bash
# 1. Kloniraj repozitorij
cd thermochef

# 2. Kopiraj konfiguraciju
cp .env.example .env
# Uredi .env i dodaj ANTHROPIC_API_KEY

# 3. Pokretanje
./start.sh
```

Otvori **http://localhost:5173** u pregledniku.

## Značajke

- **URL uvoz** - Zalijepi link recepta, automatski dohvaćanje
- **Coolinarika.com** - Posebna podrška za hrvatski receptni site
- **Foto OCR** - Fotografiraj recept, Claude AI ga prepoznaje
- **Ručni unos** - Kompletan obrazac s drag-and-drop
- **Thermomix koraci** - Temperatura, brzina, trajanje, pribor
- **Cookidoo sync** - Sinkronizacija s Cookidoo računom
- **ZIP izvoz** - Za ručni uvoz u Cookidoo
- **JSON backup** - Izvoz svih recepata

## Cookidoo integracija

Cookidoo nema javni API. ThermoChef koristi:
1. Neformalni API (reverse-engineered) - direktna sinkronizacija
2. ZIP izvoz - pouzdana alternativa za ručni uvoz

Vjerodajnice se čuvaju lokalno u `~/.thermochef/config.json`.
