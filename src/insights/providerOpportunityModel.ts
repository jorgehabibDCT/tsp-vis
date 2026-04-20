import type { TspComparisonResponse } from '../contracts/tspComparison'
import {
  DATA_RICHNESS_LABEL_IDS,
  scoreDataRichnessField,
} from '../config/dataRichnessFieldWeights'
import type {
  ExpandableCell,
  ProviderMappingConfidence,
  Tsp,
} from '../types/dashboard'
import { averageAvailableNumericLabelPercentages } from '../utils/eventLabelCoverageBands'
import { TSP_PROVIDER_META } from '../data/tspProviderMeta'

const DATA_RICHNESS_DENOMINATOR = 5
const CSV_PREFIX = 'tsp-csv-'

export type IntegratedProviderCard = {
  tspId: string
  name: string
  providerSlug: string | null
  mappingLabel: string
  entities: number | null
  eventBreadthText: string
  eventBreadthRatio: number | null
  eventDepthAvgPct: number | null
  dataRichnessSum: number
  dataRichnessText: string
  dataRichnessPct: number
  isCsvColumn: boolean
}

function tspMeta(t: Tsp): {
  providerSlug: string | null
  providerMappingConfidence: ProviderMappingConfidence | undefined
} {
  const fallback = TSP_PROVIDER_META[t.id]
  return {
    providerSlug: t.providerSlug ?? fallback?.providerSlug ?? null,
    providerMappingConfidence:
      t.providerMappingConfidence ?? fallback?.providerMappingConfidence,
  }
}

function formatMappingLabel(
  c: ProviderMappingConfidence | undefined,
): string {
  switch (c) {
    case 'confident':
      return 'Confident mapping'
    case 'plausible_pending':
      return 'Plausible (verify branding)'
    case 'unmapped':
      return 'Unmapped'
    default:
      return '—'
  }
}

function countEventLabelTotal(model: TspComparisonResponse): number {
  const m = model.metrics.find((x) => x.id === 'metric-events-alarms')
  if (!m || m.type !== 'expandable') {
    return 0
  }
  return m.structure.groups.reduce((a, g) => a + g.labels.length, 0)
}

function getDataRichnessSum(
  cell: ExpandableCell | undefined,
): { sum: number; text: string; pct: number } {
  if (!cell || cell.kind !== 'expandable') {
    return { sum: 0, text: `0/${DATA_RICHNESS_DENOMINATOR}`, pct: 0 }
  }
  const group = cell.groups.find((g) => g.groupId === 'grp-data-richness')
  const values = group?.values ?? []
  let sum = 0
  for (let i = 0; i < DATA_RICHNESS_LABEL_IDS.length; i++) {
    const id = DATA_RICHNESS_LABEL_IDS[i]!
    const supported = values[i] === true
    sum += scoreDataRichnessField(id, supported)
  }
  const pct = (sum / DATA_RICHNESS_DENOMINATOR) * 100
  const text = `${sum % 1 === 0 ? sum : sum.toFixed(1)}/${DATA_RICHNESS_DENOMINATOR}`
  return { sum, text, pct: Math.round(pct) }
}

export function buildIntegratedProviderCards(
  model: TspComparisonResponse,
): IntegratedProviderCard[] {
  const eventTotal = countEventLabelTotal(model)
  const eventMetric = model.metrics.find((m) => m.id === 'metric-events-alarms')
  const drMetric = model.metrics.find((m) => m.id === 'metric-data-richness')
  const entityMetric = model.metrics.find((m) => m.id === 'metric-entities')

  const integrated = model.tsps.filter(
    (t) => t.integrationStatus !== 'pending_integration',
  )

  const cards: IntegratedProviderCard[] = integrated.map((t) => {
    const meta = tspMeta(t)
    const isCsv = t.id.startsWith(CSV_PREFIX)

    let entities: number | null = null
    if (entityMetric?.type === 'scalar') {
      const sc = entityMetric.values[t.id]
      const v = sc?.value ?? null
      entities = v !== null && Number.isFinite(v) ? v : null
    }

    let eventBreadthText = '—'
    let eventBreadthRatio: number | null = null
    let eventDepthAvgPct: number | null = null

    if (eventMetric?.type === 'expandable') {
      const cell = eventMetric.values[t.id]
      if (
        cell?.kind === 'expandable' &&
        cell.summary !== null &&
        !Number.isNaN(cell.summary)
      ) {
        const total = cell.eventLabelRollup?.totalLabels ?? eventTotal
        const supported = cell.eventLabelRollup?.supportedCount ?? cell.summary
        if (total > 0) {
          eventBreadthText = `${supported}/${total}`
          eventBreadthRatio = supported / total
        }
        const depth = averageAvailableNumericLabelPercentages(cell)
        eventDepthAvgPct =
          depth !== null && Number.isFinite(depth) ? Math.round(depth) : null
      }
    }

    const drCell = drMetric?.type === 'expandable' ? drMetric.values[t.id] : undefined
    const rich = getDataRichnessSum(drCell)

    return {
      tspId: t.id,
      name: t.name,
      providerSlug: meta.providerSlug,
      mappingLabel: formatMappingLabel(meta.providerMappingConfidence),
      entities,
      eventBreadthText,
      eventBreadthRatio,
      eventDepthAvgPct,
      dataRichnessSum: rich.sum,
      dataRichnessText: rich.text,
      dataRichnessPct: rich.pct,
      isCsvColumn: isCsv,
    }
  })

  return cards.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export type OpportunityInsight = { label: string; detail: string }

export function computeTopOpportunities(
  model: TspComparisonResponse,
): OpportunityInsight[] {
  const cards = buildIntegratedProviderCards(model)
  const out: OpportunityInsight[] = []

  const withLive = cards.filter(
    (c) =>
      c.entities !== null &&
      c.eventDepthAvgPct !== null &&
      c.eventBreadthRatio !== null,
  )
  if (withLive.length > 0) {
    const sortedVol = [...withLive].sort(
      (a, b) => (b.entities ?? 0) - (a.entities ?? 0),
    )
    const topE = sortedVol[0]!
    const weakestDepth = [...withLive].sort(
      (a, b) => (a.eventDepthAvgPct ?? 0) - (b.eventDepthAvgPct ?? 0),
    )[0]!
    out.push({
      label: 'Volume vs label depth',
      detail: `${topE.name} has the highest entity count (${formatInt(topE.entities)}) among integrated providers; ${weakestDepth.name} has the lowest average label coverage (${weakestDepth.eventDepthAvgPct}%).`,
    })
  }

  const richGap = [...cards]
    .filter((c) => c.eventBreadthRatio !== null)
    .map((c) => ({
      c,
      gap:
        (c.eventBreadthRatio ?? 0) -
        (c.dataRichnessSum / DATA_RICHNESS_DENOMINATOR),
    }))
    .sort((a, b) => b.gap - a.gap)
  if (richGap[0] && richGap[0].gap > 0.15) {
    const { c, gap } = richGap[0]
    out.push({
      label: 'Breadth vs richness gap',
      detail: `${c.name} shows wide event-label breadth (${c.eventBreadthText}) but a lower data-richness score (${c.dataRichnessText} · ${c.dataRichnessPct}%). Gap ≈ ${(gap * 100).toFixed(0)} pts.`,
    })
  }

  const breadthRich = [...cards].sort((a, b) => {
    const br = (b.eventBreadthRatio ?? 0) - (a.eventBreadthRatio ?? 0)
    if (br !== 0) {
      return br
    }
    return a.dataRichnessSum - b.dataRichnessSum
  })
  if (breadthRich[0] && breadthRich[breadthRich.length - 1]) {
    const hi = breadthRich[0]!
    const lo = breadthRich[breadthRich.length - 1]!
    if (hi.tspId !== lo.tspId) {
      out.push({
        label: 'Breadth leader / richness laggard',
        detail: `Strongest event breadth: ${hi.name} (${hi.eventBreadthText}). Lowest richness score: ${lo.name} (${lo.dataRichnessText}).`,
      })
    }
  }

  const pendingUnmapped = model.tsps.filter(
    (t) =>
      t.integrationStatus === 'pending_integration' &&
      !(t.providerSlug ?? TSP_PROVIDER_META[t.id]?.providerSlug),
  )
  if (pendingUnmapped.length > 0) {
    const names = pendingUnmapped
      .slice(0, 5)
      .map((t) => t.name)
      .join('; ')
    const more =
      pendingUnmapped.length > 5
        ? ` (+${pendingUnmapped.length - 5} more)`
        : ''
    out.push({
      label: 'Pending brands (no bucket slug)',
      detail: `${names}${more} — listed in the matrix but not mapped to a live provider tag yet.`,
    })
  }

  const csvOnly = cards.filter((c) => c.isCsvColumn).length
  if (csvOnly > 0) {
    out.push({
      label: 'CSV audit-only providers',
      detail: `${csvOnly} integrated columns (${CSV_PREFIX}*) come from the audit CSV bucket list; they are not the same as branded enterprise rows.`,
    })
  }

  return out.slice(0, 6)
}

function formatInt(n: number | null): string {
  if (n === null || !Number.isFinite(n)) {
    return '—'
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    n,
  )
}
