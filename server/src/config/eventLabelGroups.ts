/**
 * Maps real Influx label signals into the fixed dashboard expandable metric
 * (`metric-events-alarms`): three groups and their child row IDs from `mockTspComparison`.
 *
 * Influx side (see `influxEventLabels.ts`):
 * - Measurement: same as entities — `providers` (override: `INFLUX_PROVIDERS_MEASUREMENT`).
 * - Rows: `label == "label_count"` and `_field` in `INFLUX_EVENT_LABEL_FIELDS` (default:
 *   `label_type` only). `_value` is usually the machine label code; add description fields via env
 *   only if you accept possible semantic overlap with `label_type`.
 * - Provider dimension: **`provider` tag** (same slugs as `TSP_PROVIDER_SLUGS`).
 * - Time range: same Flux window as entity metric (`INFLUX_ENTITY_RANGE`, default `-3d`).
 */

export const INFLUX_EVENT_LABEL_ROW = {
  /** Tag on `providers` measurement selecting label metadata rows */
  labelTagValue: 'label_count',
  /** Canonical default `_field` (matches `getInfluxEventLabelFields()` when env unset). */
  defaultValueFields: ['label_type'] as const,
} as const

export type EventGroupId =
  | 'grp-critical'
  | 'grp-events'
  | 'grp-diagnostics'

export type EventChildLabelId =
  | 'al-engine-off'
  | 'al-battery'
  | 'al-door'
  | 'ev-speed'
  | 'ev-idle'
  | 'ev-geofence'
  | 'ev-harsh'
  | 'dx-dtc'
  | 'dx-maint'

export type DashboardEventChildRef = {
  groupId: EventGroupId
  childLabelId: EventChildLabelId
}

/**
 * Ordered rules: first match wins. Tokens are compared after `normalizeInfluxLabelSignal`.
 */
export type InfluxLabelMappingRule = {
  tokens: string[]
  target: DashboardEventChildRef
}

export const INFLUX_LABEL_TO_DASHBOARD_CHILD: InfluxLabelMappingRule[] = [
  // Critical alarms
  {
    tokens: [
      'ignoff',
      'engine off',
      'engine-off',
      'motor apagado',
      'vehículo desactivado',
      'véhicule désactivé',
      'unauthorized',
    ],
    target: { groupId: 'grp-critical', childLabelId: 'al-engine-off' },
  },
  {
    tokens: [
      'battery',
      'batería',
      'bateria',
      'low battery',
      'voltaje',
      'perdida de energía',
      'pérdida de energía',
      'power loss',
      'ecu_battery',
    ],
    target: { groupId: 'grp-critical', childLabelId: 'al-battery' },
  },
  {
    tokens: [
      'door',
      'puerta',
      'armed',
      'lock',
      'candado',
      'io_in',
      'hood',
      'capot',
    ],
    target: { groupId: 'grp-critical', childLabelId: 'al-door' },
  },
  // Event labels
  {
    tokens: [
      'speed',
      'speeding',
      'overspeed',
      'exceso',
      'kph',
      'mph',
      'velocity',
    ],
    target: { groupId: 'grp-events', childLabelId: 'ev-speed' },
  },
  {
    tokens: [
      'idle',
      'negac',
      'dev_idle',
      'excessive idle',
      'ralenti',
      'descanso',
    ],
    target: { groupId: 'grp-events', childLabelId: 'ev-idle' },
  },
  {
    tokens: [
      'geofence',
      'geo-fence',
      'fence',
      'zona',
      'zone exit',
      'perímetro',
      'perimetro',
      'posac',
    ],
    target: { groupId: 'grp-events', childLabelId: 'ev-geofence' },
  },
  {
    tokens: [
      'harsh',
      'braking',
      'brusco',
      'brusca',
      'frenado',
      'aceleración',
      'aceleracion',
      'hard brake',
      'hard accel',
    ],
    target: { groupId: 'grp-events', childLabelId: 'ev-harsh' },
  },
  // Diagnostics
  {
    tokens: [
      'dtc',
      'obd',
      'fault',
      'diagnostic trouble',
      'código de falla',
      'codigo de falla',
      'ecu_error',
    ],
    target: { groupId: 'grp-diagnostics', childLabelId: 'dx-dtc' },
  },
  {
    tokens: [
      'maintenance',
      'mantenimiento',
      'service',
      'due',
      'mant.',
      'oil change',
    ],
    target: { groupId: 'grp-diagnostics', childLabelId: 'dx-maint' },
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
  for (const rule of INFLUX_LABEL_TO_DASHBOARD_CHILD) {
    for (const t of rule.tokens) {
      const nt = t.toLowerCase()
      if (norm === nt || norm.includes(nt) || nt.includes(norm)) {
        return rule.target
      }
    }
  }
  return null
}
