import express from 'express'
import { getEnv, validateEnv } from './config/env.js'
import { getSnapshot, setSnapshot } from './cache/snapshotStore.js'
import { runCohortRefresh } from './compute/runCohortRefresh.js'

const env = getEnv()
validateEnv(env)

const app = express()

let refreshInFlight = false

async function refreshSnapshot(reason: 'startup' | 'interval'): Promise<void> {
  if (refreshInFlight) {
    console.log(`[cohort-service] refresh skipped reason=in_flight trigger=${reason}`)
    return
  }
  refreshInFlight = true
  const t0 = Date.now()
  try {
    console.log(`[cohort-service] refresh start trigger=${reason}`)
    const snapshot = await runCohortRefresh(env)
    setSnapshot(snapshot)
    console.log(
      `[cohort-service] refresh ok trigger=${reason} elapsedMs=${Date.now() - t0}`,
    )
  } catch (e) {
    console.error(
      `[cohort-service] refresh failed trigger=${reason} elapsedMs=${Date.now() - t0}`,
      e,
    )
  } finally {
    refreshInFlight = false
  }
}

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.get('/readyz', (_req, res) => {
  const snapshot = getSnapshot(env.snapshotMaxStaleMs)
  if (!snapshot) {
    res.status(503).json({ ok: false, reason: 'snapshot_unavailable' })
    return
  }
  res.status(200).json({ ok: true, stale: snapshot.stale, generatedAt: snapshot.generatedAt })
})

app.get('/internal-hardware-cohorts/snapshot', (_req, res) => {
  const snapshot = getSnapshot(env.snapshotMaxStaleMs)
  if (!snapshot) {
    res.status(503).json({
      version: new Date().toISOString(),
      generatedAt: null,
      stale: true,
      ttlMs: env.refreshIntervalMs,
      cohorts: null,
      errors: ['snapshot_unavailable'],
    })
    return
  }
  res.status(200).json(snapshot)
})

app.listen(env.port, async () => {
  console.log(`[cohort-service] listening on :${env.port}`)
  await refreshSnapshot('startup')
  setInterval(() => {
    void refreshSnapshot('interval')
  }, env.refreshIntervalMs)
})
