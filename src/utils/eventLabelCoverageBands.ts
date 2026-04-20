/**
 * Coverage-driven styling for Event labels / Alarms Info (live Influx merge only).
 * Bands are half-open on the upper bound except where noted; `pct` is 0–100.
 */
export function eventLabelCoverageBandClass(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) {
    return 'comparison-table__num--label-cov-0'
  }
  if (pct <= 16) {
    return 'comparison-table__num--label-cov-1'
  }
  if (pct <= 33) {
    return 'comparison-table__num--label-cov-2'
  }
  if (pct <= 50) {
    return 'comparison-table__num--label-cov-3'
  }
  if (pct <= 66) {
    return 'comparison-table__num--label-cov-4'
  }
  if (pct <= 87) {
    return 'comparison-table__num--label-cov-5'
  }
  return 'comparison-table__num--label-cov-6'
}
