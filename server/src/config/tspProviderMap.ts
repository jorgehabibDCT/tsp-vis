import { buildProviderSlugDefaults } from './dashboardMatrixConfig.js'

/**
 * Maps each dashboard TSP id to the Influx **provider** tag value used in the `providers` measurement.
 *
 * Defaults are derived from the current dashboard matrix column set.
 * Override entirely with env `TSP_PROVIDER_SLUGS` (JSON object) on Render if your slugs differ.
 */
export const DEFAULT_TSP_PROVIDER_SLUGS: Record<string, string> = buildProviderSlugDefaults()

export function getTspProviderSlugMap(): Record<string, string> {
  const raw = process.env.TSP_PROVIDER_SLUGS?.trim()
  if (!raw) {
    return { ...DEFAULT_TSP_PROVIDER_SLUGS }
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...DEFAULT_TSP_PROVIDER_SLUGS, ...(parsed as Record<string, string>) }
    }
  } catch {
    console.warn(
      '[tspProviderMap] TSP_PROVIDER_SLUGS is not valid JSON; using defaults only',
    )
  }
  return { ...DEFAULT_TSP_PROVIDER_SLUGS }
}
