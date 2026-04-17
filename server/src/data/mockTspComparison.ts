/**
 * Backend-owned mock for `GET /api/dashboard/tsp-comparison`.
 * Shape matches the frontend `TspComparisonResponse` contract.
 * `tspComparisonService` merges Influx-backed entity counts into metric `metric-entities` when configured; this file remains the fallback and source for other metrics.
 */

const tspIds = {
  fleetHub: 'tsp-fleethub',
  trackLink: 'tsp-tracklink',
  nexus: 'tsp-nexus',
} as const

export const mockTspComparisonResponse = {
  tsps: [
    { id: tspIds.fleetHub, name: 'FleetHub Pro' },
    { id: tspIds.trackLink, name: 'TrackLink SaaS' },
    { id: tspIds.nexus, name: 'Nexus Telemetry' },
  ],
  metrics: [
    {
      id: 'metric-entities',
      label: 'Number of Entities (Vehicles or Assets)',
      type: 'scalar',
      kind: 'integer',
      values: {
        [tspIds.fleetHub]: { kind: 'scalar', value: 1284 },
        [tspIds.trackLink]: { kind: 'scalar', value: 942 },
        [tspIds.nexus]: { kind: 'scalar', value: 2103 },
      },
    },
    {
      id: 'metric-integration',
      label: 'Integration %',
      type: 'scalar',
      kind: 'percent',
      values: {
        [tspIds.fleetHub]: { kind: 'scalar', value: 87 },
        [tspIds.trackLink]: { kind: 'scalar', value: 72 },
        [tspIds.nexus]: { kind: 'scalar', value: 91 },
      },
    },
    {
      id: 'metric-events-alarms',
      label: 'Event labels / Alarms Info',
      type: 'expandable',
      structure: {
        groups: [
          {
            id: 'grp-critical',
            title: 'Critical alarms',
            labels: [
              { id: 'al-engine-off', name: 'Engine off (unauthorized)' },
              { id: 'al-battery', name: 'Battery low' },
              { id: 'al-door', name: 'Door open while armed' },
            ],
          },
          {
            id: 'grp-events',
            title: 'Event labels',
            labels: [
              { id: 'ev-speed', name: 'Speeding' },
              { id: 'ev-idle', name: 'Excessive idle' },
              { id: 'ev-geofence', name: 'Geofence exit' },
              { id: 'ev-harsh', name: 'Harsh braking' },
            ],
          },
          {
            id: 'grp-diagnostics',
            title: 'Diagnostics',
            labels: [
              { id: 'dx-dtc', name: 'DTC active' },
              { id: 'dx-maint', name: 'Maintenance due' },
            ],
          },
        ],
      },
      values: {
        [tspIds.fleetHub]: {
          kind: 'expandable',
          summary: 156,
          groups: [
            { groupId: 'grp-critical', values: [12, 28, 9] },
            { groupId: 'grp-events', values: [34, 21, 18, 15] },
            { groupId: 'grp-diagnostics', values: [11, 8] },
          ],
        },
        [tspIds.trackLink]: {
          kind: 'expandable',
          summary: 203,
          groups: [
            { groupId: 'grp-critical', values: [19, 41, 14] },
            { groupId: 'grp-events', values: [44, 33, 27, 22] },
            { groupId: 'grp-diagnostics', values: [15, 8] },
          ],
        },
        [tspIds.nexus]: {
          kind: 'expandable',
          summary: 118,
          groups: [
            { groupId: 'grp-critical', values: [7, 19, 5] },
            { groupId: 'grp-events', values: [22, 17, 14, 12] },
            { groupId: 'grp-diagnostics', values: [14, 8] },
          ],
        },
      },
    },
  ],
} as const
