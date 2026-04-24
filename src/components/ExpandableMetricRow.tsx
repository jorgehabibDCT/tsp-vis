import type { ReactNode } from 'react'
import type { ExpandableMetricRow, Tsp } from '../types/dashboard'
import {
  averageAvailableNumericLabelPercentages,
  eventLabelFractionBandClass,
} from '../utils/eventLabelCoverageBands'
import { formatInteger } from '../utils/format'
import { ChevronButton } from './ChevronButton'

type ExpandableMetricRowProps = {
  metric: ExpandableMetricRow
  tsps: Tsp[]
  expanded: boolean
  onToggle: () => void
  detailsId: string
}

export function ExpandableMetricRow({
  metric,
  tsps,
  expanded,
  onToggle,
  detailsId,
}: ExpandableMetricRowProps) {
  const isSupportMatrix = metric.kind === 'support'
  const isMeterMetric = metric.id === 'metric-data-richness'
  const totalLabels = metric.structure.groups.reduce(
    (acc, g) => acc + g.labels.length,
    0,
  )

  return (
    <tr className="comparison-table__row comparison-table__row--expandable-parent">
      <th scope="row" className="comparison-table__label comparison-table__label--with-toggle">
        <span className="comparison-table__toggle-wrap">
          <ChevronButton
            expanded={expanded}
            onClick={onToggle}
            controlsId={detailsId}
            label={metric.label}
          />
          <span className="comparison-table__label-text">{metric.label}</span>
        </span>
      </th>
      {tsps.map((tsp) => {
        const cell = metric.values[tsp.id]
        const raw = cell?.summary ?? null

        let display: ReactNode
        if (
          metric.id === 'metric-events-alarms' &&
          cell?.kind === 'expandable'
        ) {
          if (raw === null || Number.isNaN(raw)) {
            display = '—'
          } else {
            const avg = averageAvailableNumericLabelPercentages(cell)
            const roundedAvg =
              avg !== null && Number.isFinite(avg) ? Math.round(avg) : null
            const fracCls = eventLabelFractionBandClass(roundedAvg)

            const rollup = cell.eventLabelRollup
            let frac: string | null = null
            if (
              rollup != null &&
              Number.isFinite(rollup.supportedCount) &&
              Number.isFinite(rollup.totalLabels) &&
              rollup.totalLabels > 0
            ) {
              frac = `${rollup.supportedCount}/${rollup.totalLabels}`
            } else if (Number.isFinite(raw) && totalLabels > 0) {
              frac = `${raw}/${totalLabels}`
            }

            display =
              frac === null ? (
                '—'
              ) : (
                <span
                  className={`comparison-table__event-label-fraction ${fracCls}`}
                >
                  {frac}
                </span>
              )
          }
        } else if (isSupportMatrix) {
          if (raw === null || Number.isNaN(raw)) {
            display = '—'
          } else {
            const frac = `${raw}/${totalLabels}`
            if (isMeterMetric) {
              const bars = computeFilledBars(raw, totalLabels)
              display = (
                <span className="comparison-table__fraction-meter">
                  <span
                    className="comparison-table__stat-meter comparison-table__stat-meter--richness"
                    role="img"
                    aria-label={`${frac} coverage`}
                  >
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const isOn = idx < bars
                      return (
                        <span
                          key={idx}
                          className={`comparison-table__stat-meter-segment${
                            isOn
                              ? ' comparison-table__stat-meter-segment--on'
                              : ''
                          }`}
                          aria-hidden="true"
                        />
                      )
                    })}
                  </span>
                  <span className="comparison-table__fraction-meter-text">{frac}</span>
                </span>
              )
            } else {
              display = frac
            }
          }
        } else {
          display = formatInteger(raw)
        }

        const isEventLabelRow =
          metric.id === 'metric-events-alarms' && cell?.kind === 'expandable'
        const cls = isSupportMatrix
          ? `comparison-table__num comparison-table__num--support-summary${
              isEventLabelRow ? ' comparison-table__num--event-label-summary' : ''
            }`
          : 'comparison-table__num'
        return (
          <td key={tsp.id} className={cls}>
            {display}
          </td>
        )
      })}
    </tr>
  )
}

function computeFilledBars(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number {
  if (
    numerator == null ||
    denominator == null ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0
  }
  const ratio = numerator / denominator
  return Math.max(0, Math.min(5, Math.ceil(ratio * 5)))
}
