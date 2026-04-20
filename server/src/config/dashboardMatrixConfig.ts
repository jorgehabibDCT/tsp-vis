type MatrixLabel = { id: string; name: string }
type MatrixGroup = { id: string; title: string; labels: MatrixLabel[] }

/**
 * Bucket `provider` tag alignment (see `server/INFLUX_BUCKET_AUDIT.md` / `server/audit-output/providers.json`).
 * - confident — brand/name clearly matches an observed slug; safe for live Influx joins.
 * - plausible_pending — reserved for future use when a candidate slug is suspected but unverified.
 * - unmapped — `providerSlug` is null; column stays on curated mock for live-backed rows.
 */
export type ProviderMappingConfidence =
  | 'confident'
  | 'plausible_pending'
  | 'unmapped'

export type DashboardTsp = {
  id: string
  name: string
  logoUrl: string | null
  /** Exact Influx `provider` tag (case/space sensitive) or null. */
  providerSlug: string | null
  providerMappingConfidence: ProviderMappingConfidence
}

/** Observed bucket key for “Localizadores GTS” (includes space; must match Flux filters). */
export const BUCKET_PROVIDER_LOCALIZADORES_GTS = 'localizadores gts' as const

export const DASHBOARD_TSPS: DashboardTsp[] = [
  // confident — santrack in audit
  {
    id: 'tsp-santrack-internacional',
    name: 'SANTRACK INTERNACIONAL',
    logoUrl: 'https://gruposantrack.com/wp-content/uploads/2019/07/Santrak-texto-gde.png',
    providerSlug: 'santrack',
    providerMappingConfidence: 'confident',
  },
  // confident — INFO-TRAX / Tecnologistik → technologistic in providers table
  {
    id: 'tsp-tecnologistik-occidente',
    name: 'TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX)',
    logoUrl: 'https://www.info-trax.com/lp-infotrax-deteccion-de-jammer/images/logo.png',
    providerSlug: 'technologistic',
    providerMappingConfidence: 'confident',
  },
  // confident — ontracking in audit
  {
    id: 'tsp-ontracking-remote-metrics',
    name: 'ONTRACKING GPS REMOTE METRICS',
    logoUrl: 'https://portalv3.ontracking.com.mx/ontlogo.svg',
    providerSlug: 'ontracking',
    providerMappingConfidence: 'confident',
  },
  {
    id: 'tsp-skymeduza',
    name: 'SKYMEDUZA',
    logoUrl: 'https://skymeduza.com/images/sky-logo2.png',
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-skyguardian',
    name: 'SKYGUARDIAN',
    logoUrl: 'https://skyguardian.us/images/simplecms/logo_logotipo-200w.jpg',
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-phoenix-telematics',
    name: 'PHOENIX TELEMATICS',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-tecno-gps',
    name: 'TECNO-GPS',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-itrack',
    name: 'ITRACK',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-ttc-total-tracking-center',
    name: 'TTC TOTAL TRACKING CENTER',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-ads-logic',
    name: 'GRUPO COMERCIAL ADS LOGIC DE MÉXICO',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  // confident — autotracking in audit
  {
    id: 'tsp-autotracking-world-connect',
    name: 'AUTOTRACKING WORLD CONNECT',
    logoUrl: null,
    providerSlug: 'autotracking',
    providerMappingConfidence: 'confident',
  },
  {
    id: 'tsp-tecnologia-servicios-y-vision',
    name: 'TECNOLOGÍA SERVICIOS Y VISION',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-navman-wireless-mexico',
    name: 'NAVMAN WIRELESS DE MÉXICO',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  // confident — hunter in audit
  {
    id: 'tsp-hunter',
    name: 'HUNTER',
    logoUrl: null,
    providerSlug: 'hunter',
    providerMappingConfidence: 'confident',
  },
  {
    id: 'tsp-gorilamx',
    name: 'GORILAMX',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-atlantida',
    name: 'ATLANTIDA',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  // confident — exact bucket key string (includes space)
  {
    id: 'tsp-localizadores-gts',
    name: 'LOCALIZADORES GTS',
    logoUrl: null,
    providerSlug: BUCKET_PROVIDER_LOCALIZADORES_GTS,
    providerMappingConfidence: 'confident',
  },
  {
    id: 'tsp-blac',
    name: 'BLAC',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  {
    id: 'tsp-motorlink',
    name: 'MOTORLINK',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
]

export const EVENT_ALARM_GROUPS: MatrixGroup[] = [
  {
    id: 'grp-tracking-telematics',
    title: 'Tracking / Telematics',
    // Row IDs mirror `label_type` codes observed in `server/INFLUX_BUCKET_AUDIT.md` (pegasus256).
    labels: [
      'trckpnt',
      'prdtst',
      'ignon',
      'ignoff',
      'panic',
      'pwrloss',
      'pwrrstd',
      'lwbatt',
      'stp',
    ].map((id) => ({ id, name: id })),
  },
  {
    id: 'grp-driving-behavior',
    title: 'Driving Behavior',
    labels: [
      'spd',
      'spdend',
      'idl',
      'idlend',
      'posac',
      'negac',
      'aggr',
      'aggdrvcrv',
      'crnrleft',
      'crnrright',
      'coldet',
      'crash',
      'agglnchng',
    ].map((id) => ({ id, name: id })),
  },
  {
    id: 'grp-adas-dms',
    title: 'ADAS & DMS',
    labels: [
      'mblypdfcw',
      'mblyhdwrn',
      'mblyrldw',
      'mblylldw',
      'mblypddng',
      'mblyfcw',
      'adastlgt',
      'mblyspd',
      'mdasfvsa',
      'mdasfpw',
      'mblybrkon',
      'mblywprs',
      'ftgwarning',
      'ftgalarm',
      'ftgdrvmis',
      'ftgdistrct',
      'ftgcamphon',
      'ftgnosblt',
      'ftgcamsmok',
      'ftgcamblck',
      'ftgfoodrnk',
    ].map((id) => ({ id, name: id })),
  },
]

export const DATA_RICHNESS_GROUPS: MatrixGroup[] = [
  {
    id: 'grp-data-richness',
    title: 'Event Data Fields / Data Richness',
    // Support flags for curated matrix are defined in `DATA_RICHNESS_FIELD_SOURCES` (audit: hdop, dev_dist, dev_idle; GPS/accel unsupported in window).
    labels: [
      { id: 'gps-satellites', name: 'GPS Satellites' },
      { id: 'dop', name: 'DOP' },
      { id: 'instant-acceleration', name: 'Instant acceleration' },
      { id: 'engine-odometer', name: 'Engine odometer' },
      { id: 'engine-hourmeter', name: 'Engine hourmeter' },
    ],
  },
]

export function buildProviderSlugDefaults(): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tsp of DASHBOARD_TSPS) {
    if (tsp.providerSlug) {
      out[tsp.id] = tsp.providerSlug
    }
  }
  return out
}
