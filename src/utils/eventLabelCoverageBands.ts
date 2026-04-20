import type { ExpandableCell } from '../types/dashboard'

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

/**
 * Mean of child-label values that are real numeric coverage percentages (0–100).
 * Skips null, booleans, and **0%** rows (ignored for the mean, same as the user’s
 * rule for “non-zero” coverage). Only non-zero percentages contribute to the average
 * used to color the parent-row fraction.
 */
export function averageAvailableNumericLabelPercentages(
  cell: ExpandableCell,
): number | null {
  const nums: number[] = []
  for (const g of cell.groups) {
    for (const v of g.values) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        nums.push(v)
      }
    }
  }
  if (nums.length === 0) {
    return null
  }
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length
  return Number.isFinite(mean) ? mean : null
}

/**
 * Parent-row fraction text color (same breakpoints as child cells; text-only classes).
 * `null` = no numeric child coverage available (curated booleans, etc.).
 */
export function eventLabelFractionBandClass(
  roundedAvgPct: number | null,
): string {
  if (roundedAvgPct === null || !Number.isFinite(roundedAvgPct)) {
    return 'comparison-table__event-frac-neutral'
  }
  if (roundedAvgPct <= 0) {
    return 'comparison-table__event-frac-cov-0'
  }
  if (roundedAvgPct <= 16) {
    return 'comparison-table__event-frac-cov-1'
  }
  if (roundedAvgPct <= 33) {
    return 'comparison-table__event-frac-cov-2'
  }
  if (roundedAvgPct <= 50) {
    return 'comparison-table__event-frac-cov-3'
  }
  if (roundedAvgPct <= 66) {
    return 'comparison-table__event-frac-cov-4'
  }
  if (roundedAvgPct <= 87) {
    return 'comparison-table__event-frac-cov-5'
  }
  return 'comparison-table__event-frac-cov-6'
}
