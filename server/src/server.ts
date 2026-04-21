import cors from 'cors'
import express from 'express'
import { getAllowedOriginSet } from './cors.js'
import { dashboardRouter } from './routes/dashboard.js'
import { pegasusThemePreferencesRouter } from './routes/pegasusThemePreferences.js'

const PORT = Number(process.env.PORT) || 4000

const allowedOrigins = getAllowedOriginSet()

const app = express()

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = !origin || allowedOrigins.has(origin)
      if (origin && !allowed) {
        console.warn(`[cors] blocked origin: ${origin}`)
      }
      callback(null, allowed)
    },
  }),
)

app.use('/api/dashboard', dashboardRouter)
app.use('/api/v1', pegasusThemePreferencesRouter())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`TSP comparison API listening on http://localhost:${PORT}`)
  console.log(
    `[cors] allowed origins (${allowedOrigins.size}): ${[...allowedOrigins].join(', ')}`,
  )
})
