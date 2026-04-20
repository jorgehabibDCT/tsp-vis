/**
 * Aligns with `server/src/config/dashboardTruthSources.ts` `DATA_RICHNESS_FIELD_SOURCES`.
 * Scoring: direct bucket field = 1.0, proxy = 0.5, unsupported in audit window = 0.
 */
export type DataRichnessFieldKind = 'direct' | 'proxy' | 'unsupported'

export const DATA_RICHNESS_FIELD_WEIGHTS: Record<
  string,
  { kind: DataRichnessFieldKind }
> = {
  'gps-satellites': { kind: 'unsupported' },
  dop: { kind: 'proxy' },
  'instant-acceleration': { kind: 'unsupported' },
  'engine-odometer': { kind: 'proxy' },
  'engine-hourmeter': { kind: 'proxy' },
}

/** Ordered label ids for the single data-richness group (5 fields). */
export const DATA_RICHNESS_LABEL_IDS: string[] = [
  'gps-satellites',
  'dop',
  'instant-acceleration',
  'engine-odometer',
  'engine-hourmeter',
]

export function scoreDataRichnessField(
  fieldId: string,
  matrixSupported: boolean,
): number {
  if (!matrixSupported) {
    return 0
  }
  const meta = DATA_RICHNESS_FIELD_WEIGHTS[fieldId]
  if (!meta) {
    return 0
  }
  if (meta.kind === 'direct') {
    return 1
  }
  if (meta.kind === 'proxy') {
    return 0.5
  }
  return 0
}
