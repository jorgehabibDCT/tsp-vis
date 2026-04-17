/**
 * Maps each dashboard TSP id to the Influx **provider** tag value used in the `providers` measurement.
 *
 * Defaults are derived from `2285.csv` sample exports (e.g. teltonika, hunter, pegasus-iot-cloud).
 * Override entirely with env `TSP_PROVIDER_SLUGS` (JSON object) on Render if your slugs differ.
 */
export const DEFAULT_TSP_PROVIDER_SLUGS: Record<string, string> = {
  'tsp-fleethub': 'teltonika',
  'tsp-tracklink': 'hunter',
  'tsp-nexus': 'pegasus-iot-cloud',
}

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
