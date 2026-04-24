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
const CSV_ONLY_BUCKET_COLUMNS: {
  id: string
  name: string
  providerSlug: string
  logoUrl?: string | null
}[] = [
  {
    id: 'tsp-csv-arrendamex',
    name: 'Arrendamex',
    providerSlug: 'arrendamex',
    logoUrl: 'https://arrendamex.com.mx/_astro/logo_arrendamex.23WWfAWC.png',
  },
  {
    id: 'tsp-csv-fleetup',
    name: 'Fleetup',
    providerSlug: 'fleetup',
    logoUrl:
      'https://fleetup.com/wp-content/themes/fleetup/dist/images/fleetup-logo.svg',
  },
  {
    id: 'tsp-csv-ftr',
    name: 'FTR',
    providerSlug: 'ftr',
    logoUrl:
      'https://www.ftrintel.com/hs-fs/hubfs/FTR%20Logos%20and%20Icons/FTR_Logo_Primary_DarkBackground.png?width=650&height=180&name=FTR_Logo_Primary_DarkBackground.png',
  },
  {
    id: 'tsp-csv-geotrucks',
    name: 'Geotrucks',
    providerSlug: 'geotrucks',
    logoUrl: 'https://en.geotrucks.com/ima/logo-light.svg',
  },
  {
    id: 'tsp-csv-innovalinks',
    name: 'Innovalinks',
    providerSlug: 'innovalinks',
    logoUrl: 'https://www.innovalinks.com/imgs/InnovaLinks.png',
  },
  {
    id: 'tsp-csv-logitrack',
    name: 'Logitrack',
    providerSlug: 'logitrack',
    logoUrl: 'https://img.logitrack.mx/dct/logoltD_2.png',
  },
  {
    id: 'tsp-csv-lojack',
    name: 'LoJack',
    providerSlug: 'lojack',
    logoUrl: 'https://www.lojack.com/wp-content/uploads/2023/05/logo-rgb-1.png',
  },
  {
    id: 'tsp-csv-motum',
    name: 'Motum',
    providerSlug: 'motum',
    logoUrl: 'https://telematics.tecnomotum.com/assets/img/login-brand.svg',
  },
  {
    id: 'tsp-csv-numaris',
    name: 'Numaris',
    providerSlug: 'numaris',
    logoUrl:
      'https://cdn.prod.website-files.com/677db901a978f3d313090945/679055231f82688fdcefbd6f_LogotipoN.svg',
  },
  { id: 'tsp-csv-rec', name: 'Rec', providerSlug: 'rec' },
  { id: 'tsp-csv-resser', name: 'Resser', providerSlug: 'resser', logoUrl: 'https://resser.com/wp-content/uploads/2024/03/logo-resser.png' },
  { id: 'tsp-csv-samsara', name: 'Samsara', providerSlug: 'samsara' },
  { id: 'tsp-csv-sitrack', name: 'Sitrack', providerSlug: 'sitrack' },
  {
    id: 'tsp-csv-traffilog',
    name: 'Traffilog',
    providerSlug: 'traffilog',
    logoUrl:
      'https://telematicswire.net/wp-content/uploads/2021/11/Traffilog_Logo_RGB-web-1.png',
  },
  {
    id: 'tsp-csv-ubicamovil',
    name: 'Ubicamovil',
    providerSlug: 'ubicamovil',
    logoUrl: 'https://landingpage-ubicamovil.s3.amazonaws.com/logo-ubicamovil.png',
  },
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
    logoUrl: 'https://www.gpsphoenix.com/img/logos/logo-dark.png',
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  // plausible_pending — CSV: groupName "Telematics_advance Integracion" → properties_tag telematics_advance;
  // aligns with TECNO-GPS telematics scope; not identical branding → keep plausible, not confident.
  {
    id: 'tsp-tecno-gps',
    name: 'TECNO-GPS',
    logoUrl: 'https://tecnogps.cl/wp-content/uploads/2020/03/Logo-tecnogps.png',
    providerSlug: 'telematics_advance',
    providerMappingConfidence: 'plausible_pending',
    integrationStatus: INT,
  },
  {
    id: 'tsp-itrack',
    name: 'ITRACK',
    logoUrl: 'https://www.itrack.top/local/itrack.top/images/left_logo.png',
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-ttc-total-tracking-center',
    name: 'TTC TOTAL TRACKING CENTER',
    logoUrl: 'https://trackingcenter.mx/wp-content/uploads/2024/02/TTC-D.png',
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
    integrationStatus: PEND,
  },
  {
    id: 'tsp-ads-logic',
    name: 'GRUPO COMERCIAL ADS LOGIC DE MÉXICO',
    logoUrl: 'https://adslogicmexico.com/wp-content/uploads/logo_svg.svg',
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
    logoUrl: 'https://www.teletracnavman.com/media/25914/teletrac-rgb-pbv-pos_resize.png',
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
    logoUrl: 'https://gorilamx.com/wp-content/themes/gorila/img/logov3.png',
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
    logoUrl:
      'https://media.licdn.com/dms/image/v2/D4E0BAQGB2nU1Raatvg/company-logo_200_200/B4EZk1tm3YKYAI-/0/1757542772593?e=2147483647&v=beta&t=ROfzPilFDkl9mvvUxVIgsQDLGrHx2lU7FkEVAF6Iz-w',
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
    logoUrl: c.logoUrl ?? null,
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
