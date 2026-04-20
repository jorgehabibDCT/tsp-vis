import type { ExpandableMetricRow, Tsp } from '../types/dashboard'
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
        const eventLabelRollup =
          metric.id === 'metric-events-alarms' &&
          cell?.kind === 'expandable'
            ? cell.eventLabelRollup
            : undefined

        let display: string
        if (eventLabelRollup) {
          const { supportedCount, totalLabels: tl, aggregatePct } =
            eventLabelRollup
          display = `${supportedCount}/${tl} · ${Math.round(aggregatePct)}%`
        } else if (isSupportMatrix) {
          display =
            raw === null || Number.isNaN(raw)
              ? '—'
              : `${raw}/${totalLabels}`
        } else {
          display = formatInteger(raw)
        }

        const cls = isSupportMatrix
          ? `comparison-table__num comparison-table__num--support-summary${
              eventLabelRollup ? ' comparison-table__num--event-label-summary' : ''
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
