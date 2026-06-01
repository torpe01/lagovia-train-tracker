# 🚆 Lagovia Train Tracker

Real-time Belgian train departure tracker, powered by the free [iRail API](https://docs.irail.be/).

Built for the Digital Product School Engineering Track Technical Challenge.

```
lagovia/
├── api/          ← Node.js + Express backend
├── frontend/     ← React frontend
└── package.json  ← root scripts to run both together
```

---

## Quick start (run both together)

### Prerequisites
- Node.js >= 18 ([download](https://nodejs.org))

### Install & run

```bash
# 1. Clone
git clone https://github.com/torpe01/lagovia-train-tracker.git
cd lagovia-train-tracker

# 2. Install all dependencies (root + api + frontend)
npm run install:all

# 3. Run both API and frontend together
npm run dev
```

- **API** → http://localhost:3000
- **Frontend** → http://localhost:3001

---

## Run them separately

```bash
# API only
npm run start:api

# Frontend only (needs API running)
npm run start:frontend
```

---

## API Reference

### `GET /departures?q=<query>`

Returns all departures in the next 15 minutes from every station matching the query.

- Query must be **at least 3 characters**, otherwise returns a `400` error.

**Success `200`:**
```json
{
  "query": "Bru",
  "generatedAt": "2024-06-01T10:30:00.000Z",
  "windowMinutes": 15,
  "stationsFound": 8,
  "stationsQueried": 6,
  "stations": [
    {
      "id": "BE.NMBS.008891009",
      "name": "Brussel-Centraal",
      "departures": [
        {
          "train": "IC 1234",
          "destination": "Gent-Sint-Pieters",
          "scheduledTime": "10:35",
          "scheduledTimestamp": 1717234500,
          "delayMinutes": 2,
          "canceled": false,
          "platform": "3"
        }
      ]
    }
  ]
}
```

**Error `400` — query too short:**
```json
{
  "error": "QUERY_TOO_SHORT",
  "message": "Query must be at least 3 characters.",
  "minLength": 3,
  "received": 2
}
```

### `GET /health`
```json
{ "status": "ok", "timestamp": "2024-06-01T10:30:00.000Z" }
```

---

## Decisions & trade-offs

- **Monorepo**: single repo for easy submission and review — one `git clone` and you're running.
- **Proxy**: the React frontend proxies `/departures` to `localhost:3000` in development via `package.json "proxy"`, so no hardcoded URLs or CORS issues.
- **Station search**: full station list fetched from iRail and filtered client-side. iRail caches this endpoint aggressively via ETags.
- **Rate limiting**: capped at 6 parallel liveboard requests to respect iRail's 3 req/sec limit.
- **15-minute window**: filtered on `scheduledTime`, matching the spec exactly.

## Known limitations

- Station results capped at 6 per search (rate limit safety)
- No fuzzy search (bonus feature, not implemented)
- No server-side caching (a Redis 30s cache would help in production)

## Time spent

~3 hours total: 30min reading iRail docs, 90min coding, 30min UI, 30min docs.

## AI Usage

See [AI_USAGE.md](./AI_USAGE.md).
