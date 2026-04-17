/**
 * Nullable numeric display for table cells.
 */
export function formatNullableNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }
  return String(value)
}

export function formatInteger(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '—'
  }
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value / 100)
}
