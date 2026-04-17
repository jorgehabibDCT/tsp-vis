import cors from 'cors'
import express from 'express'
import { dashboardRouter } from './routes/dashboard.js'

const PORT = Number(process.env.PORT) || 4000

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

const app = express()

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(null, false)
    },
  }),
)

app.use('/api/dashboard', dashboardRouter)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`TSP comparison API listening on http://localhost:${PORT}`)
})
