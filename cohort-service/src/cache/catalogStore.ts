import type { HardwareCatalogSnapshot } from '../types.js'

let latestCatalog: HardwareCatalogSnapshot | null = null

export function setCatalog(snapshot: HardwareCatalogSnapshot): void {
  latestCatalog = snapshot
}

export function getLatestCatalog(): HardwareCatalogSnapshot | null {
  return latestCatalog
}

export function getCatalog(maxStaleMs: number): HardwareCatalogSnapshot | null {
  if (!latestCatalog) {
    return null
  }
  const ageMs = Date.now() - new Date(latestCatalog.generatedAt).getTime()
  return {
    ...latestCatalog,
    stale: ageMs > maxStaleMs,
  }
}
