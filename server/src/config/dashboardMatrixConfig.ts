type MatrixLabel = { id: string; name: string }
type MatrixGroup = { id: string; title: string; labels: MatrixLabel[] }

/**
 * Bucket `provider` tag alignment (see `server/INFLUX_BUCKET_AUDIT.md` / `server/audit-output/providers.json`).
 * CSV (`TSP Data Apr 20 2026 Audit.csv`): `properties_tag` / `groupName` used only for defensible
 * upgrades; test, customer, personal-name, and `--` rows ignored.
 *
 * - confident — brand/name clearly matches an observed slug (audit and/or CSV).
 * - plausible_pending — `properties_tag` is a reasonable candidate; naming not verified as identical brand.
 * - unmapped — `providerSlug` is null; column stays on curated mock for live-backed rows.
 */
export type ProviderMappingConfidence =
  | 'confident'
  | 'plausible_pending'
  | 'unmapped'

/** UI column: brand-only columns awaiting validated bucket mapping vs CSV-imported provider columns. */
export type TspIntegrationStatus = 'pending_integration' | 'integrated'

export type DashboardTsp = {
  id: string
  name: string
  logoUrl: string | null
  /** Exact Influx `provider` tag (case/space sensitive) or null. */
  providerSlug: string | null
  providerMappingConfidence: ProviderMappingConfidence
  integrationStatus: TspIntegrationStatus
}

/** Observed bucket key for “Localizadores GTS” (includes space; must match Flux filters). */
export const BUCKET_PROVIDER_LOCALIZADORES_GTS = 'localizadores gts' as const

const INT = 'integrated' as const
const PEND = 'pending_integration' as const

/**
 * Additional columns from `TSP Data Apr 20 2026 Audit.csv` `properties_tag` values not already covered by branded rows.
 * Display names are short labels for the matrix (not legal entity names).
 */
const CSV_ONLY_BUCKET_COLUMNS: { id: string; name: string; providerSlug: string }[] = [
  { id: 'tsp-csv-arrendamex', name: 'Arrendamex', providerSlug: 'arrendamex' },
  { id: 'tsp-csv-fleetup', name: 'Fleetup', providerSlug: 'fleetup' },
  { id: 'tsp-csv-ftr', name: 'FTR', providerSlug: 'ftr' },
  { id: 'tsp-csv-geotrucks', name: 'Geotrucks', providerSlug: 'geotrucks' },
  { id: 'tsp-csv-innovalinks', name: 'Innovalinks', providerSlug: 'innovalinks' },
  { id: 'tsp-csv-logitrack', name: 'Logitrack', providerSlug: 'logitrack' },
  { id: 'tsp-csv-lojack', name: 'LoJack', providerSlug: 'lojack' },
  { id: 'tsp-csv-motum', name: 'Motum', providerSlug: 'motum' },
  { id: 'tsp-csv-numaris', name: 'Numaris', providerSlug: 'numaris' },
  { id: 'tsp-csv-queclink', name: 'Queclink', providerSlug: 'queclink' },
  { id: 'tsp-csv-rec', name: 'Rec', providerSlug: 'rec' },
  { id: 'tsp-csv-resser', name: 'Resser', providerSlug: 'resser' },
  { id: 'tsp-csv-samsara', name: 'Samsara', providerSlug: 'samsara' },
  { id: 'tsp-csv-sitrack', name: 'Sitrack', providerSlug: 'sitrack' },
  { id: 'tsp-csv-traffilog', name: 'Traffilog', providerSlug: 'traffilog' },
  { id: 'tsp-csv-ubicamovil', name: 'Ubicamovil', providerSlug: 'ubicamovil' },
]

export const DASHBOARD_TSPS: DashboardTsp[] = [
  // confident — santrack in audit
  {
    id: 'tsp-santrack-internacional',
    name: 'SANTRACK INTERNACIONAL',
    logoUrl: 'https://gruposantrack.com/wp-content/uploads/2019/07/Santrak-texto-gde.png',
    providerSlug: 'santrack',
    providerMappingConfidence: 'confident',
    integrationStatus: INT,
  },
  // confident — INFO-TRAX / Tecnologistik → technologistic in providers table
  {
    id: 'tsp-tecnologistik-occidente',
    name: 'TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX)',
    logoUrl: 'https://www.info-trax.com/lp-infotrax-deteccion-de-jammer/images/logo.png',
    providerSlug: 'technologistic',
    providerMappingConfidence: 'confident',
    integrationStatus: INT,
  },
  // confident — ontracking in audit
  {
    id: 'tsp-ontracking-remote-metrics',
    name: 'ONTRACKING GPS REMOTE METRICS',
    logoUrl: 'https://portalv3.ontracking.com.mx/ontlogo.svg',
    providerSlug: 'ontracking',
    providerMappingConfidence: 'confident',
    integrationStatus: INT,
  },
  {
    id: 'tsp-skymeduza',
    name: 'SKYMEDUZA',
    logoUrl: 'https://skymeduza.com/images/sky-logo2.png',
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-skyguardian',
    name: 'SKYGUARDIAN',
    logoUrl: 'https://skyguardian.us/images/simplecms/logo_logotipo-200w.jpg',
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-phoenix-telematics',
    name: 'PHOENIX TELEMATICS',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  // plausible_pending — CSV: groupName "Telematics_advance Integracion" → properties_tag telematics_advance;
  // aligns with TECNO-GPS telematics scope; not identical branding → keep plausible, not confident.
  {
    id: 'tsp-tecno-gps',
    name: 'TECNO-GPS',
    logoUrl: null,
    providerSlug: 'telematics_advance',
    providerMappingConfidence: 'plausible_pending',
    integrationStatus: INT,
  },
  {
    id: 'tsp-itrack',
    name: 'ITRACK',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-ttc-total-tracking-center',
    name: 'TTC TOTAL TRACKING CENTER',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-ads-logic',
    name: 'GRUPO COMERCIAL ADS LOGIC DE MÉXICO',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  // confident — autotracking in audit
  {
    id: 'tsp-autotracking-world-connect',
    name: 'AUTOTRACKING WORLD CONNECT',
    logoUrl: null,
    providerSlug: 'autotracking',
    providerMappingConfidence: 'confident',
    integrationStatus: INT,
  },
  {
    id: 'tsp-tecnologia-servicios-y-vision',
    name: 'TECNOLOGÍA SERVICIOS Y VISION',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-navman-wireless-mexico',
    name: 'NAVMAN WIRELESS DE MÉXICO',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  // confident — hunter in audit
  {
    id: 'tsp-hunter',
    name: 'HUNTER',
    logoUrl: null,
    providerSlug: 'hunter',
    providerMappingConfidence: 'confident',
    integrationStatus: INT,
  },
  {
    id: 'tsp-gorilamx',
    name: 'GORILAMX',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-atlantida',
    name: 'ATLANTIDA',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  // confident — exact bucket key string (includes space)
  {
    id: 'tsp-localizadores-gts',
    name: 'LOCALIZADORES GTS',
    logoUrl: null,
    providerSlug: BUCKET_PROVIDER_LOCALIZADORES_GTS,
    providerMappingConfidence: 'confident',
    integrationStatus: INT,
  },
  {
    id: 'tsp-blac',
    name: 'BLAC',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-motorlink',
    name: 'MOTORLINK',
    logoUrl: null,
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  ...CSV_ONLY_BUCKET_COLUMNS.map((c) => ({
    id: c.id,
    name: c.name,
    logoUrl: null,
    providerSlug: c.providerSlug,
    providerMappingConfidence: 'confident' as const,
    integrationStatus: INT,
  })),
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
