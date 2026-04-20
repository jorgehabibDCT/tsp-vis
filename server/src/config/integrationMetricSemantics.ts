import { DASHBOARD_TSPS } from './dashboardMatrixConfig.js'

export type IntegrationFormulaProposal = {
  metricId: 'metric-integration'
  sourceType: 'hybrid'
  meaning: string
  numeratorDefinition: string
  denominatorDefinition: string
  scope: string
  timeWindow: string
  requiredInputs: string[]
  computableToday: boolean
  blockingReason: string
}

/**
 * Explicit business-semantics proposal for Integration %.
 * Kept separate from row values so the contract stays stable while inputs are implemented.
 */
export const INTEGRATION_FORMULA_PROPOSAL: IntegrationFormulaProposal = {
  metricId: 'metric-integration',
  sourceType: 'hybrid',
  meaning:
    'Percent of required integration capabilities implemented and actively verified for each TSP.',
  numeratorDefinition:
    'Count of required capabilities that are both implemented and pass verification in the evaluation window.',
  denominatorDefinition:
    'Total count of required capabilities defined by the integration baseline for that TSP tier.',
  scope:
    'Per TSP, across the approved integration capability baseline (events, data fields, transport, and operational controls).',
  timeWindow:
    'Rolling 30 days for verification evidence, plus latest static capability registry snapshot.',
  requiredInputs: [
    'Authoritative per-TSP capability registry (required capabilities baseline).',
    'Verification evidence feed (tests/checks) with pass/fail status and timestamps.',
    'Mapping between verification checks and capability ids.',
  ],
  computableToday: false,
  blockingReason:
    'Capability baseline and verification evidence are not yet integrated into backend data sources.',
}

export type IntegrationPlaceholderCell = {
  kind: 'scalar'
  value: number | null
}

/**
 * Until the formula inputs exist, publish explicit null placeholders.
 */
export const INTEGRATION_UNDEFINED_PLACEHOLDER_VALUES: Record<
  string,
  IntegrationPlaceholderCell
> = Object.fromEntries(
  DASHBOARD_TSPS.map((tsp) => [tsp.id, { kind: 'scalar', value: null }]),
)
