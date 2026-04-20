import { DASHBOARD_TSPS, buildProviderSlugDefaults } from './dashboardMatrixConfig.js'

/**
 * Maps each dashboard TSP id to the Influx **provider** tag value used in the `providers` measurement.
 * Keys cover **every** dashboard column; value `null` means no live mapping — entity/event queries use curated fallback.
 *
 * Defaults are derived from `DASHBOARD_TSPS` (`providerSlug` + `providerMappingConfidence`).
 * Override per id with env `TSP_PROVIDER_SLUGS` (JSON object). Use explicit `null` to keep a column unmapped.
 *
 * Common bucket keys (not pre-assigned to columns without validation): `teltonika`, `pegasus-iot-cloud`,
 * `fleetup`, `samsara` — bind via `TSP_PROVIDER_SLUGS` when a TSP↔provider link is confirmed.
 */
export const DEFAULT_TSP_PROVIDER_SLUGS: Record<string, string> =
  buildProviderSlugDefaults()

function buildDefaultSlugMapWithNulls(): Record<string, string | null> {
  return Object.fromEntries(
    DASHBOARD_TSPS.map((t) => [t.id, t.providerSlug]),
  )
}

/** Every `DASHBOARD_TSPS[].id` → slug or explicit `null`. */
export function getTspProviderSlugMap(): Record<string, string | null> {
  const base = buildDefaultSlugMapWithNulls()
  const raw = process.env.TSP_PROVIDER_SLUGS?.trim()
  if (!raw) {
    return base
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...base, ...(parsed as Record<string, string | null>) }
    }
  } catch {
    console.warn(
      '[tspProviderMap] TSP_PROVIDER_SLUGS is not valid JSON; using defaults only',
    )
  }
  return base
}
