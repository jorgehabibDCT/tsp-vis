import type { CohortSnapshot } from '../types.js'

let latestSnapshot: CohortSnapshot | null = null

export function setSnapshot(snapshot: CohortSnapshot): void {
  latestSnapshot = snapshot
}

export function getSnapshot(maxStaleMs: number): CohortSnapshot | null {
  if (!latestSnapshot) {
    return null
  }
  const ageMs = Date.now() - new Date(latestSnapshot.generatedAt).getTime()
  return {
    ...latestSnapshot,
    stale: ageMs > maxStaleMs,
  }
}
