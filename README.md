# TSP Comparison Dashboard

Vite + React frontend (deployable to Vercel) and a small Express API (for Render) that serves the same TSP comparison JSON the UI expects.

## Frontend

```bash
npm install
npm run dev
```

- Default: loads **mock data** in the browser (no API). Set **`VITE_API_URL`** only when pointing at the API.

## API (local)

```bash
cd server && npm install && npm run dev
```

- Listens on **`http://localhost:4000`** (override with **`PORT`**).
- **`GET /api/dashboard/tsp-comparison`** — dashboard JSON (mock payload, contract-stable).
- **`GET /health`** — liveness.

### Point the SPA at the API

Terminal 1: `npm run dev:api` (or `cd server && npm run dev`)

Terminal 2:

```bash
VITE_API_URL=http://localhost:4000 npm run dev
```

Or create `.env.development.local` in the repo root:

```env
VITE_API_URL=http://localhost:4000
```

Then run `npm run dev`. The UI should load from the backend (no “Mock data” badge when the response is `remote`).

CORS allows the Vite dev server (`localhost:5173`, `127.0.0.1:5173`) and `vite preview` (`4173`).

## Builds

- Frontend: `npm run build`
- API: `npm run build:api` then `cd server && npm start`

## Deploying the API on Render (later)

- **Root directory:** `server`
- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- Render sets **`PORT`**; the server reads `process.env.PORT`.
