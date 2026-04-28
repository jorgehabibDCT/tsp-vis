export type CohortSlug =
  | '__internal_teltonika'
  | '__internal_lynx'
  | '__internal_antares'
  | '__internal_syrus'

export type CohortSnapshotItem = {
  entities: number | null
  eventLabels: Record<string, number>
  richness: Record<string, number>
  status: 'ok' | 'partial' | 'empty' | 'error'
}

export type CohortSnapshot = {
  version: string
  generatedAt: string
  stale: boolean
  ttlMs: number
  cohorts: Record<CohortSlug, CohortSnapshotItem>
  mongo: Record<CohortSlug, { docsMatched: number; canonicalVids: number }>
  errors: string[]
}
