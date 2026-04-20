/**
 * Maps real Influx label signals into the fixed dashboard expandable metric
 * (`metric-events-alarms`): groups and child row IDs from `EVENT_ALARM_GROUPS` in
 * `dashboardMatrixConfig.ts`.
 *
 * Influx side (see `influxEventLabels.ts`):
 * - Measurement: same as entities — `providers` (override: `INFLUX_PROVIDERS_MEASUREMENT`).
 * - Rows: `label == "label_count"` and `_field` in `INFLUX_EVENT_LABEL_FIELDS` (default:
 *   `label_type` only). `_value` is usually the machine label code; add description fields via env
 *   only if you accept possible semantic overlap with `label_type`.
 * - Provider dimension: **`provider` tag** (same slugs as `TSP_PROVIDER_SLUGS`).
 * - Time range: same Flux window as entity metric (`INFLUX_ENTITY_RANGE`, default `-3d`).
 *
 * Label inventory observed in bucket: `server/INFLUX_BUCKET_AUDIT.md` (pegasus256 window).
 */

import { EVENT_ALARM_GROUPS } from './dashboardMatrixConfig.js'

export const INFLUX_EVENT_LABEL_ROW = {
  /** Tag on `providers` measurement selecting label metadata rows */
  labelTagValue: 'label_count',
  /** Canonical default `_field` (matches `getInfluxEventLabelFields()` when env unset). */
  defaultValueFields: ['label_type'] as const,
} as const

export type EventGroupId = (typeof EVENT_ALARM_GROUPS)[number]['id']

export type DashboardEventChildRef = {
  groupId: EventGroupId
  childLabelId: string
}

export type InfluxLabelMappingRule = {
  tokens: string[]
  target: DashboardEventChildRef
}

/** Machine codes and row IDs from the dashboard matrix — exact match after normalization. */
const EXACT_INFLUX_LABEL_TO_CHILD: Record<string, DashboardEventChildRef> = (() => {
  const m: Record<string, DashboardEventChildRef> = {}
  for (const g of EVENT_ALARM_GROUPS) {
    const groupId = g.id as EventGroupId
    for (const l of g.labels) {
      m[l.id] = { groupId, childLabelId: l.id }
    }
  }
  return m
})()

/**
 * Natural-language / localized description fallback. Longer tokens first where substring
 * matching matters (e.g. spdend before spd).
 */
const INFLUX_LABEL_FUZZY_RULES: InfluxLabelMappingRule[] = [
  // Tracking / Telematics
  {
    tokens: ['track point', 'tracking point', 'waypoint', 'ping'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'trckpnt' },
  },
  {
    tokens: ['product', 'sensor test', 'prueba'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'prdtst' },
  },
  {
    tokens: ['ignon', 'ign on', 'ignition on', 'engine on', 'motor encendido'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'ignon' },
  },
  {
    tokens: [
      'ignoff',
      'ign off',
      'engine off',
      'engine-off',
      'motor apagado',
      'vehículo desactivado',
      'véhicule désactivé',
    ],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'ignoff' },
  },
  {
    tokens: ['panic', 'pánico', 'sos'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'panic' },
  },
  {
    tokens: ['pwrloss', 'power loss', 'perdida de energía', 'pérdida de energía'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'pwrloss' },
  },
  {
    tokens: ['pwrrstd', 'power restored'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'pwrrstd' },
  },
  {
    tokens: ['lwbatt', 'low battery', 'battery', 'batería', 'bateria', 'voltaje', 'ecu_battery'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'lwbatt' },
  },
  {
    tokens: ['stop', 'stopped', 'stp'],
    target: { groupId: 'grp-tracking-telematics', childLabelId: 'stp' },
  },
  // Driving — specific before broad
  {
    tokens: ['spdend'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'spdend' },
  },
  {
    tokens: ['idlend'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'idlend' },
  },
  {
    tokens: ['aggdrvcrv', 'aggressive curve', 'curva'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'aggdrvcrv' },
  },
  {
    tokens: ['negac', 'negative acceleration'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'negac' },
  },
  {
    tokens: ['excessive idle', 'ralenti', 'descanso', 'idle stop', 'idle event'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'idl' },
  },
  {
    tokens: ['posac', 'positive acceleration'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'posac' },
  },
  {
    tokens: ['coldet', 'collision'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'coldet' },
  },
  {
    tokens: ['crash'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'crash' },
  },
  {
    tokens: ['agglnchng'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'agglnchng' },
  },
  {
    tokens: ['crnrright'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'crnrright' },
  },
  {
    tokens: ['crnrleft'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'crnrleft' },
  },
  {
    tokens: ['harsh', 'hard brake', 'hard accel', 'hard braking', 'brusco', 'frenado brusco', 'aggressive driving'],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'aggr' },
  },
  {
    tokens: [
      'overspeed',
      'speeding',
      'exceso',
      'velocity',
      'kph',
      'mph',
      'spd',
    ],
    target: { groupId: 'grp-driving-behavior', childLabelId: 'spd' },
  },
  // ADAS / DMS — brand tokens
  {
    tokens: ['ftgdistrct', 'distracted'],
    target: { groupId: 'grp-adas-dms', childLabelId: 'ftgdistrct' },
  },
  {
    tokens: ['ftgcamphon', 'phone', 'teléfono'],
    target: { groupId: 'grp-adas-dms', childLabelId: 'ftgcamphon' },
  },
  {
    tokens: ['ftgcamblck', 'blocked', 'camera'],
    target: { groupId: 'grp-adas-dms', childLabelId: 'ftgcamblck' },
  },
  {
    tokens: ['ftgfoodrnk', 'food', 'drink'],
    target: { groupId: 'grp-adas-dms', childLabelId: 'ftgfoodrnk' },
  },
  {
    tokens: ['ftgalarm'],
    target: { groupId: 'grp-adas-dms', childLabelId: 'ftgalarm' },
  },
  {
    tokens: ['ftgwarning', 'fleet safety', 'warning'],
    target: { groupId: 'grp-adas-dms', childLabelId: 'ftgwarning' },
  },
]

export function normalizeInfluxLabelSignal(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * Returns the dashboard child slot for this raw Influx `_value` (label code or description).
 */
export function resolveDashboardChild(
  rawInfluxValue: string,
): DashboardEventChildRef | null {
  const norm = normalizeInfluxLabelSignal(rawInfluxValue)
  if (!norm) {
    return null
  }

  const exact = EXACT_INFLUX_LABEL_TO_CHILD[norm]
  if (exact) {
    return exact
  }

  for (const rule of INFLUX_LABEL_FUZZY_RULES) {
    for (const t of rule.tokens) {
      const nt = t.toLowerCase()
      if (norm === nt || norm.includes(nt) || nt.includes(norm)) {
        return rule.target
      }
    }
  }
  return null
}
