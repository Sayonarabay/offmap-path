# Offsite — Viajes con criterio

AI-powered travel planning using a knowledge base + Claude for personalization.

## Stack
- **Frontend**: Vanilla HTML/CSS/JS (zero dependencies)
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude (intro + tips only)
- **Deploy**: Vercel

---

## Setup local

```bash
# 1. Install dependencies
npm install

# 2. Copy env vars
cp .env.example .env
# → Fill in ANTHROPIC_API_KEY and email settings

# 3. Run
npm run dev
# → http://localhost:3000
```

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel

# Set environment variables in Vercel dashboard:
# ANTHROPIC_API_KEY, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
```

Or connect your GitHub repo in vercel.com and it deploys automatically.

---

## Project structure

```
offsite/
├── public/
│   └── index.html          ← Full frontend (single file)
├── api/
│   ├── routes/
│   │   ├── searchTrips.js   ← POST /api/search-trips
│   │   ├── generateTrip.js  ← POST /api/generate-trip
│   │   ├── sendEmail.js     ← POST /api/email
│   │   └── trip.js          ← POST/GET /api/trip
│   ├── services/
│   │   ├── knowledgeBase.js ← Reads /kb JSON files
│   │   ├── tripBuilder.js   ← Assembles trip from KB
│   │   └── aiPersonalization.js ← Calls Claude
│   └── config/
│       └── index.js
├── kb/
│   ├── destinations.json
│   ├── itineraries/
│   │   └── paris-7day-cultural.json
│   └── activities/
│       └── cultural.json
├── server.js               ← Express entry point
├── package.json
├── vercel.json
└── .env.example
```

---

## Adding destinations

1. Add entry to `kb/destinations.json`
2. Create `kb/itineraries/{slug}-{N}day-{type}.json`
3. Done — no code changes needed

## KB itinerary format

```json
{
  "slug": "city-7day-cultural",
  "destination": "city",
  "days_count": 7,
  "tripType": "cultural",
  "tags": ["art", "history"],
  "days": [
    {
      "day": 1,
      "title": "Day title",
      "theme": "subtitle",
      "morning": "...",
      "afternoon": "...",
      "evening": "...",
      "gem": "Hidden tip",
      "activities": ["activity-id-1"]
    }
  ]
}
```
