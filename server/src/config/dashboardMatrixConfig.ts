type MatrixLabel = { id: string; name: string }
type MatrixGroup = { id: string; title: string; labels: MatrixLabel[] }

export type DashboardTsp = {
  id: string
  name: string
  logoUrl: string | null
  providerSlug: string | null
}

export const DASHBOARD_TSPS: DashboardTsp[] = [
  { id: 'tsp-santrack-internacional', name: 'SANTRACK INTERNACIONAL', logoUrl: 'https://gruposantrack.com/wp-content/uploads/2019/07/Santrak-texto-gde.png', providerSlug: 'santrack' },
  { id: 'tsp-tecnologistik-occidente', name: 'TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX)', logoUrl: 'https://www.info-trax.com/lp-infotrax-deteccion-de-jammer/images/logo.png', providerSlug: null },
  { id: 'tsp-ontracking-remote-metrics', name: 'ONTRACKING GPS REMOTE METRICS', logoUrl: 'https://portalv3.ontracking.com.mx/ontlogo.svg', providerSlug: null },
  { id: 'tsp-skymeduza', name: 'SKYMEDUZA', logoUrl: 'https://skymeduza.com/images/sky-logo2.png', providerSlug: null },
  { id: 'tsp-skyguardian', name: 'SKYGUARDIAN', logoUrl: 'https://skyguardian.us/images/simplecms/logo_logotipo-200w.jpg', providerSlug: null },
  { id: 'tsp-phoenix-telematics', name: 'PHOENIX TELEMATICS', logoUrl: null, providerSlug: null },
  { id: 'tsp-tecno-gps', name: 'TECNO-GPS', logoUrl: null, providerSlug: null },
  { id: 'tsp-itrack', name: 'ITRACK', logoUrl: null, providerSlug: null },
  { id: 'tsp-ttc-total-tracking-center', name: 'TTC TOTAL TRACKING CENTER', logoUrl: null, providerSlug: null },
  { id: 'tsp-ads-logic', name: 'GRUPO COMERCIAL ADS LOGIC DE MÉXICO', logoUrl: null, providerSlug: null },
  { id: 'tsp-autotracking-world-connect', name: 'AUTOTRACKING WORLD CONNECT', logoUrl: null, providerSlug: 'autotracking' },
  { id: 'tsp-tecnologia-servicios-y-vision', name: 'TECNOLOGÍA SERVICIOS Y VISION', logoUrl: null, providerSlug: null },
  { id: 'tsp-navman-wireless-mexico', name: 'NAVMAN WIRELESS DE MÉXICO', logoUrl: null, providerSlug: null },
  { id: 'tsp-hunter', name: 'HUNTER', logoUrl: null, providerSlug: 'hunter' },
  { id: 'tsp-gorilamx', name: 'GORILAMX', logoUrl: null, providerSlug: null },
  { id: 'tsp-atlantida', name: 'ATLANTIDA', logoUrl: null, providerSlug: null },
  { id: 'tsp-localizadores-gts', name: 'LOCALIZADORES GTS', logoUrl: null, providerSlug: null },
  { id: 'tsp-blac', name: 'BLAC', logoUrl: null, providerSlug: null },
  { id: 'tsp-motorlink', name: 'MOTORLINK', logoUrl: null, providerSlug: null },
]

export const EVENT_ALARM_GROUPS: MatrixGroup[] = [
  {
    id: 'grp-tracking-telematics',
    title: 'Tracking / Telematics',
    labels: [
      'trckpnt',
      'prdtst',
      'ignon',
      'ignoff',
      'panic',
      'pwrloss',
      'pwrrstd',
      'lwbatt',
      'stt',
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
