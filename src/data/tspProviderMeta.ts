import type { ProviderMappingConfidence } from '../types/dashboard'

/**
 * Mirrors `server/src/config/dashboardMatrixConfig.ts` `DASHBOARD_TSPS` slug + confidence.
 * Used when the client mock payload does not include these fields on each TSP.
 */
export const TSP_PROVIDER_META: Record<
  string,
  { providerSlug: string | null; providerMappingConfidence: ProviderMappingConfidence }
> = {
  'tsp-santrack-internacional': {
    providerSlug: 'santrack',
    providerMappingConfidence: 'confident',
  },
  'tsp-tecnologistik-occidente': {
    providerSlug: 'technologistic',
    providerMappingConfidence: 'confident',
  },
  'tsp-ontracking-remote-metrics': {
    providerSlug: 'ontracking',
    providerMappingConfidence: 'confident',
  },
  'tsp-skymeduza': {
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  'tsp-skyguardian': {
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  'tsp-phoenix-telematics': {
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  'tsp-tecno-gps': {
    providerSlug: 'telematics_advance',
    providerMappingConfidence: 'plausible_pending',
  },
  'tsp-itrack': { providerSlug: null, providerMappingConfidence: 'unmapped' },
  'tsp-ttc-total-tracking-center': {
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  'tsp-ads-logic': { providerSlug: null, providerMappingConfidence: 'unmapped' },
  'tsp-autotracking-world-connect': {
    providerSlug: 'autotracking',
    providerMappingConfidence: 'confident',
  },
  'tsp-tecnologia-servicios-y-vision': {
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  'tsp-navman-wireless-mexico': {
    providerSlug: null,
    providerMappingConfidence: 'unmapped',
  },
  'tsp-hunter': { providerSlug: 'hunter', providerMappingConfidence: 'confident' },
  'tsp-gorilamx': { providerSlug: null, providerMappingConfidence: 'unmapped' },
  'tsp-atlantida': { providerSlug: null, providerMappingConfidence: 'unmapped' },
  'tsp-localizadores-gts': {
    providerSlug: 'localizadores gts',
    providerMappingConfidence: 'confident',
  },
  'tsp-blac': { providerSlug: null, providerMappingConfidence: 'unmapped' },
  'tsp-motorlink': { providerSlug: null, providerMappingConfidence: 'unmapped' },
  'tsp-csv-arrendamex': {
    providerSlug: 'arrendamex',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-fleetup': {
    providerSlug: 'fleetup',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-ftr': { providerSlug: 'ftr', providerMappingConfidence: 'confident' },
  'tsp-csv-geotrucks': {
    providerSlug: 'geotrucks',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-innovalinks': {
    providerSlug: 'innovalinks',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-logitrack': {
    providerSlug: 'logitrack',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-lojack': {
    providerSlug: 'lojack',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-motum': {
    providerSlug: 'motum',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-numaris': {
    providerSlug: 'numaris',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-queclink': {
    providerSlug: 'queclink',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-rec': { providerSlug: 'rec', providerMappingConfidence: 'confident' },
  'tsp-csv-resser': {
    providerSlug: 'resser',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-samsara': {
    providerSlug: 'samsara',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-sitrack': {
    providerSlug: 'sitrack',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-traffilog': {
    providerSlug: 'traffilog',
    providerMappingConfidence: 'confident',
  },
  'tsp-csv-ubicamovil': {
    providerSlug: 'ubicamovil',
    providerMappingConfidence: 'confident',
  },
}
