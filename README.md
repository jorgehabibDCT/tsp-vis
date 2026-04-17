# TSP Comparison Dashboard

Frontend at **repo root** (Vite/React → Vercel). API in **`server/`** (Express → Render). Mock-backed dashboard JSON only (no Influx yet).

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

---

## Env reference

| Where | Variable | Purpose |
|-------|----------|---------|
| **Vercel** | `VITE_API_URL` | Render API base URL; **omit** to keep using client mock (not recommended for production). |
| **Render** | `CORS_ORIGINS` | Optional extra origins beyond defaults. |

---

## Gotchas

- **HTTPS:** Production site must call an **https://** API URL (mixed content blocked if the page is HTTPS and the API is HTTP).
- **`VITE_API_URL` shape:** scheme + host only; path `/api/...` is fixed in the app (`src/api/endpoints.ts`).
- **CORS:** If the Vercel URL changes or you use preview deployments, add those origins via **`CORS_ORIGINS`** on Render.
