import type { Tsp } from '../types/dashboard'

/**
 * Fallback TSP columns when the API is unavailable. Must stay aligned with
 * `server/src/config/dashboardMatrixConfig.ts` `DASHBOARD_TSPS` (ids, names, integrationStatus).
 */
export const MOCK_DASHBOARD_TSPS: Tsp[] = [
  { id: 'tsp-santrack-internacional', name: 'SANTRACK INTERNACIONAL', logoUrl: 'https://gruposantrack.com/wp-content/uploads/2019/07/Santrak-texto-gde.png', integrationStatus: 'integrated' },
  { id: 'tsp-tecnologistik-occidente', name: 'TECNOLOGISTIK DE OCCIDENTE (INFO-TRAX)', logoUrl: 'https://www.info-trax.com/lp-infotrax-deteccion-de-jammer/images/logo.png', integrationStatus: 'integrated' },
  { id: 'tsp-ontracking-remote-metrics', name: 'ONTRACKING GPS REMOTE METRICS', logoUrl: 'https://portalv3.ontracking.com.mx/ontlogo.svg', integrationStatus: 'integrated' },
  { id: 'tsp-skymeduza', name: 'SKYMEDUZA', logoUrl: 'https://skymeduza.com/images/sky-logo2.png', integrationStatus: 'pending_integration' },
  { id: 'tsp-skyguardian', name: 'SKYGUARDIAN', logoUrl: 'https://skyguardian.us/images/simplecms/logo_logotipo-200w.jpg', integrationStatus: 'pending_integration' },
  { id: 'tsp-phoenix-telematics', name: 'PHOENIX TELEMATICS', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-tecno-gps', name: 'TECNO-GPS', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-itrack', name: 'ITRACK', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-ttc-total-tracking-center', name: 'TTC TOTAL TRACKING CENTER', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-ads-logic', name: 'GRUPO COMERCIAL ADS LOGIC DE MÉXICO', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-autotracking-world-connect', name: 'AUTOTRACKING WORLD CONNECT', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-tecnologia-servicios-y-vision', name: 'TECNOLOGÍA SERVICIOS Y VISION', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-navman-wireless-mexico', name: 'NAVMAN WIRELESS DE MÉXICO', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-hunter', name: 'HUNTER', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-gorilamx', name: 'GORILAMX', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-atlantida', name: 'ATLANTIDA', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-localizadores-gts', name: 'LOCALIZADORES GTS', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-blac', name: 'BLAC', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-motorlink', name: 'MOTORLINK', logoUrl: null, integrationStatus: 'pending_integration' },
  { id: 'tsp-csv-arrendamex', name: 'Arrendamex', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-fleetup', name: 'Fleetup', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-ftr', name: 'FTR', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-geotrucks', name: 'Geotrucks', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-innovalinks', name: 'Innovalinks', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-logitrack', name: 'Logitrack', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-lojack', name: 'LoJack', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-motum', name: 'Motum', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-numaris', name: 'Numaris', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-queclink', name: 'Queclink', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-rec', name: 'Rec', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-resser', name: 'Resser', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-samsara', name: 'Samsara', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-sitrack', name: 'Sitrack', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-traffilog', name: 'Traffilog', logoUrl: null, integrationStatus: 'integrated' },
  { id: 'tsp-csv-ubicamovil', name: 'Ubicamovil', logoUrl: null, integrationStatus: 'integrated' },
]
