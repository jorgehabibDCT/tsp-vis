/**
 * Explicit business-semantics proposal for Risk Index Enablement.
 * Separated from row values so we can keep API shape stable while making
 * assumptions and missing inputs auditable.
 */
export type RiskIndexFormulaProposal = {
  metricId: 'metric-risk-index'
  sourceType: 'hybrid'
  meaning: string
  scoringLogic: string
  componentWeights: {
    eventCoveragePct: number
    dataRichnessPct: number
    integrationPct: number
    operationalReadinessPct: number
  }
  scope: string
  timeWindow: string
  requiredInputs: string[]
  computableToday: boolean
  blockingReason: string
}

/**
 * Proposed formula (0-100):
 * risk_index =
 *   0.35 * eventCoveragePct
 * + 0.25 * dataRichnessPct
 * + 0.25 * integrationPct
 * + 0.15 * operationalReadinessPct
 */
export const RISK_INDEX_FORMULA_PROPOSAL: RiskIndexFormulaProposal = {
  metricId: 'metric-risk-index',
  sourceType: 'hybrid',
  meaning:
    'Enablement score indicating how complete and operationally reliable each TSP is for risk-sensitive workflows.',
  scoringLogic:
    'Weighted composite of event capability coverage, data richness coverage, integration completion, and operational readiness.',
  componentWeights: {
    eventCoveragePct: 0.35,
    dataRichnessPct: 0.25,
    integrationPct: 0.25,
    operationalReadinessPct: 0.15,
  },
  scope:
    'Per TSP, against the approved baseline of capabilities and operational controls for risk-index use cases.',
  timeWindow:
    'Rolling 30 days for operational/readiness evidence; latest approved baseline snapshot for capability dimensions.',
  requiredInputs: [
    'Per-TSP event capability baseline and enabled state.',
    'Per-TSP data richness baseline and enabled state.',
    'Per-TSP Integration % computed from approved formula and evidence.',
    'Operational readiness evidence (SLA/uptime/completeness or equivalent governance-defined checks).',
  ],
  computableToday: false,
  blockingReason:
    'Integration % is still non-computable and operational readiness evidence source is not wired.',
}

export type RiskIndexPlaceholderSemantics = {
  placeholderKind: 'curated_manual_score'
  valueMeaning: string
  caveat: string
}

export const RISK_INDEX_PLACEHOLDER_SEMANTICS: RiskIndexPlaceholderSemantics = {
  placeholderKind: 'curated_manual_score',
  valueMeaning:
    'Relative interim ranking signal for dashboard comparison, not a formally computed risk model output.',
  caveat:
    'Values remain curated placeholders until required inputs for weighted formula are available end-to-end.',
}
