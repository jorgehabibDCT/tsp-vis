import {
  DASHBOARD_TSPS,
  DATA_RICHNESS_GROUPS,
  EVENT_ALARM_GROUPS,
} from '../config/dashboardMatrixConfig.js'
import {
  CURATED_DATA_RICHNESS_VALUES,
  CURATED_ENTITY_MOCK_VALUES,
  CURATED_EVENT_SUPPORT_VALUES,
  CURATED_RISK_INDEX_VALUES,
} from '../config/dashboardTruthSources.js'
import { INTEGRATION_UNDEFINED_PLACEHOLDER_VALUES } from '../config/integrationMetricSemantics.js'

/**
 * Backend-owned mock for `GET /api/dashboard/tsp-comparison`.
 * Keeps the matrix structure product expects; service may replace only entities with Influx.
 */
export const mockTspComparisonResponse = {
  tsps: DASHBOARD_TSPS.map(
    ({
      id,
      name,
      logoUrl,
      integrationStatus,
      providerSlug,
      providerMappingConfidence,
    }) => ({
      id,
      name,
      logoUrl,
      integrationStatus,
      providerSlug,
      providerMappingConfidence,
    }),
  ),
  metrics: [
    {
      id: 'metric-entities',
      label: 'Number of Entities (Vehicles or Assets)',
      type: 'scalar',
      kind: 'integer',
      values: CURATED_ENTITY_MOCK_VALUES,
    },
    {
      id: 'metric-integration',
      label: 'Integration %',
      type: 'scalar',
      kind: 'percent',
      values: INTEGRATION_UNDEFINED_PLACEHOLDER_VALUES,
    },
    {
      id: 'metric-events-alarms',
      label: 'Event labels / Alarms Info',
      type: 'expandable',
      kind: 'support',
      structure: { groups: EVENT_ALARM_GROUPS },
      values: CURATED_EVENT_SUPPORT_VALUES,
    },
    {
      id: 'metric-data-richness',
      label: 'Event Data Fields / Data Richness',
      type: 'expandable',
      kind: 'support',
      structure: { groups: DATA_RICHNESS_GROUPS },
      values: CURATED_DATA_RICHNESS_VALUES,
    },
    {
      id: 'metric-risk-index',
      label: 'Risk Index Enablement',
      type: 'scalar',
      kind: 'score',
      values: CURATED_RISK_INDEX_VALUES,
    },
  ],
} as const
