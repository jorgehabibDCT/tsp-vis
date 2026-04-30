import express from 'express'
import { getEnv, validateEnv } from './config/env.js'
import { getSnapshot, setSnapshot } from './cache/snapshotStore.js'
import { getCatalog, setCatalog } from './cache/catalogStore.js'
import { runCohortRefresh } from './compute/runCohortRefresh.js'
import { runCatalogRefresh } from './compute/runCatalogRefresh.js'
import type { CohortSnapshot, HardwareCatalogSnapshot } from './types.js'

const env = getEnv()
validateEnv(env)

const app = express()

let refreshInFlight = false
let hasSuccessfulRefresh = false
let catalogRefreshInFlight = false
let hasSuccessfulCatalogRefresh = false

function seedStartupSnapshot(): void {
  const now = new Date().toISOString()
  const placeholder: CohortSnapshot = {
    version: now,
    generatedAt: now,
    stale: true,
    ttlMs: env.refreshIntervalMs,
    cohorts: {
      __internal_teltonika: { entities: 0, eventLabels: {}, richness: {}, status: 'empty' },
      __internal_lynx: { entities: 0, eventLabels: {}, richness: {}, status: 'empty' },
      __internal_antares: { entities: 0, eventLabels: {}, richness: {}, status: 'empty' },
      __internal_syrus: { entities: 0, eventLabels: {}, richness: {}, status: 'empty' },
    },
    mongo: {
      __internal_teltonika: { docsMatched: 0, canonicalVids: 0 },
      __internal_lynx: { docsMatched: 0, canonicalVids: 0 },
      __internal_antares: { docsMatched: 0, canonicalVids: 0 },
      __internal_syrus: { docsMatched: 0, canonicalVids: 0 },
    },
    errors: ['startup_refresh_in_progress'],
  }
  setSnapshot(placeholder)
}

function seedStartupCatalog(): void {
  const now = new Date().toISOString()
  const placeholder: HardwareCatalogSnapshot = {
    generatedAt: now,
    stale: true,
    vehicles: {},
    cohorts: {
      __internal_teltonika: [],
      __internal_lynx: [],
      __internal_antares: [],
      __internal_syrus: [],
    },
    counts: {
      __internal_teltonika: 0,
      __internal_lynx: 0,
      __internal_antares: 0,
      __internal_syrus: 0,
    },
    errors: ['startup_refresh_in_progress'],
  }
  setCatalog(placeholder)
}

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
    hasSuccessfulRefresh = true
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

async function refreshCatalog(reason: 'startup' | 'interval'): Promise<void> {
  if (catalogRefreshInFlight) {
    console.log(`[cohort-service] catalog refresh skipped reason=in_flight trigger=${reason}`)
    return
  }
  catalogRefreshInFlight = true
  const t0 = Date.now()
  try {
    console.log(`[cohort-service] catalog refresh start trigger=${reason}`)
    const catalog = await runCatalogRefresh(env)
    setCatalog(catalog)
    hasSuccessfulCatalogRefresh = true
    console.log(
      `[cohort-service] catalog refresh ok trigger=${reason} elapsedMs=${Date.now() - t0}`,
    )
  } catch (e) {
    console.error(
      `[cohort-service] catalog refresh failed trigger=${reason} elapsedMs=${Date.now() - t0}`,
      e,
    )
  } finally {
    catalogRefreshInFlight = false
  }
}

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.get('/readyz', (_req, res) => {
  if (!hasSuccessfulRefresh) {
    res.status(503).json({ ok: false, reason: 'startup_refresh_in_progress' })
    return
  }
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
  if (!hasSuccessfulRefresh) {
    res.status(200).json({
      ...snapshot,
      stale: true,
    })
    return
  }
  res.status(200).json(snapshot)
})

app.get('/internal-hardware-cohorts/catalog', (_req, res) => {
  const catalog = getCatalog(env.snapshotMaxStaleMs)
  if (!catalog) {
    res.status(503).json({
      generatedAt: null,
      stale: true,
      vehicles: null,
      cohorts: null,
      counts: null,
      errors: ['catalog_unavailable'],
    })
    return
  }
  if (!hasSuccessfulCatalogRefresh) {
    res.status(200).json({
      ...catalog,
      stale: true,
    })
    return
  }
  res.status(200).json(catalog)
})

app.listen(env.port, async () => {
  console.log(`[cohort-service] listening on :${env.port}`)
  seedStartupSnapshot()
  seedStartupCatalog()
  void refreshSnapshot('startup')
  void refreshCatalog('startup')
  setInterval(() => {
    void refreshSnapshot('interval')
    void refreshCatalog('interval')
  }, env.refreshIntervalMs)
})
