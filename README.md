# TSP Comparison Dashboard

Frontend at **repo root** (Vite/React → Vercel). API in **`server/`** (Express → Render). Dashboard JSON is **mock** unless Influx is configured on the API (then **Number of Entities** is live; other metrics stay mock).

## Local

| | |
|--|--|
| **Frontend** | `npm install` → `npm run dev` |
| **API** | `cd server && npm install` → `npm run dev` (default port **4000**) |

Without `VITE_API_URL`, the UI uses **in-browser mock** data. To call the API: copy `.env.example` to `.env.development.local` and set `VITE_API_URL=http://localhost:4000`.

**Checks:** `GET /health` and `GET /api/dashboard/tsp-comparison` on the API host.

---

## Deploy: Vercel (frontend)

| Setting | Value |
|--------|--------|
| **Root Directory** | `.` (repository root) |
| **Build Command** | `npm run build` |
| **Output** | `dist` |
| **Install** | `npm install` (default) |

`vercel.json` pins Vite output and SPA fallback to `index.html`.

**Required env (production):** **`VITE_API_URL`** — HTTPS **origin** of the Render API only (no path, no trailing slash), e.g. `https://your-service.onrender.com`.  
Vite inlines `VITE_*` at **build time**; change the var → **redeploy** the frontend.

---

## Deploy: Render (API)

| Setting | Value |
|--------|--------|
| **Root Directory** | `server` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

**Env:** **`PORT`** is set by Render. Optional **`CORS_ORIGINS`**: comma-separated extra allowed browser origins (e.g. Vercel preview URLs). Defaults include `https://tsp-vis.vercel.app` and local Vite — see `server/src/cors.ts`.

### Influx (optional, API only)

When **`INFLUX_HOST`**, **`INFLUX_TOKEN`**, **`INFLUX_ORG`**, and **`INFLUX_BUCKET`** are all set, the **Number of Entities (Vehicles or Assets)** metric is filled from Influx; everything else in the response stays mock. If Influx is unset or the query fails, the API returns the **full mock** payload (same shape as before).

| Variable | Purpose |
|----------|---------|
| `INFLUX_HOST` | Influx API base URL, or hostname (prefix `https://` if no scheme). |
| `INFLUX_TOKEN` | API token. |
| `INFLUX_ORG` | Organization name. |
| `INFLUX_BUCKET` | Bucket name. |
| `INFLUX_ENTITY_RANGE` | Optional Flux range (default **`-3d`**; widen if needed, e.g. `-7d`, `-30d`). |
| `INFLUX_QUERY_TIMEOUT_MS` | Optional socket timeout for Influx HTTP requests in ms (default **60000**). Set on the **API**; the client also sets `transportOptions.timeout` so Node’s `req.setTimeout` matches (SDK default is 10s). |
| `INFLUX_PROVIDERS_MEASUREMENT` | Optional measurement name (default `providers`). |
| `TSP_PROVIDER_SLUGS` | Optional JSON map from dashboard TSP id → Influx `provider` tag value (see `server/src/config/tspProviderMap.ts`). |

Copy **`server/.env.example`** for local API tests.

---

## Env reference

| Where | Variable | Purpose |
|-------|----------|---------|
| **Vercel** | `VITE_API_URL` | Render API base URL; **omit** to keep using client mock (not recommended for production). |
| **Render** | `CORS_ORIGINS` | Optional extra origins beyond defaults. |
| **Render** | `INFLUX_*`, `TSP_PROVIDER_SLUGS` | Optional; see Influx section above. |

---

## Gotchas

- **HTTPS:** Production site must call an **https://** API URL (mixed content blocked if the page is HTTPS and the API is HTTP).
- **`VITE_API_URL` shape:** scheme + host only; path `/api/...` is fixed in the app (`src/api/endpoints.ts`).
- **CORS:** If the Vercel URL changes or you use preview deployments, add those origins via **`CORS_ORIGINS`** on Render.
