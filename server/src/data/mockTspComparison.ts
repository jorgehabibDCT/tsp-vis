import {
  DASHBOARD_DATA_RICHNESS_VALUES,
  DASHBOARD_EVENT_SUPPORT_VALUES,
  DASHBOARD_INTEGRATION_VALUES,
  DASHBOARD_MOCK_ENTITY_VALUES,
  DASHBOARD_RISK_INDEX_VALUES,
  DASHBOARD_TSPS,
  DATA_RICHNESS_GROUPS,
  EVENT_ALARM_GROUPS,
} from '../config/dashboardMatrixConfig.js'

/**
 * Backend-owned mock for `GET /api/dashboard/tsp-comparison`.
 * Keeps the matrix structure product expects; service may replace only entities with Influx.
 */
export const mockTspComparisonResponse = {
  tsps: DASHBOARD_TSPS.map(({ id, name, logoUrl }) => ({ id, name, logoUrl })),
  metrics: [
    {
      id: 'metric-entities',
      label: 'Number of Entities (Vehicles or Assets)',
      type: 'scalar',
      kind: 'integer',
      values: DASHBOARD_MOCK_ENTITY_VALUES,
    },
    {
      id: 'metric-integration',
      label: 'Integration %',
      type: 'scalar',
      kind: 'percent',
      values: DASHBOARD_INTEGRATION_VALUES,
    },
    {
      id: 'metric-events-alarms',
      label: 'Event labels / Alarms Info',
      type: 'expandable',
      kind: 'support',
      structure: { groups: EVENT_ALARM_GROUPS },
      values: DASHBOARD_EVENT_SUPPORT_VALUES,
    },
    {
      id: 'metric-data-richness',
      label: 'Event Data Fields / Data Richness',
      type: 'expandable',
      kind: 'support',
      structure: { groups: DATA_RICHNESS_GROUPS },
      values: DASHBOARD_DATA_RICHNESS_VALUES,
    },
    {
      id: 'metric-risk-index',
      label: 'Risk Index Enablement',
      type: 'scalar',
      kind: 'score',
      values: DASHBOARD_RISK_INDEX_VALUES,
    },
  ],
} as const
