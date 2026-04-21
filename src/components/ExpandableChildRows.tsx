import { Fragment } from 'react'
import type { ExpandableMetricRow, Tsp } from '../types/dashboard'
import { eventLabelCoverageBandClass } from '../utils/eventLabelCoverageBands'
import { formatInteger } from '../utils/format'
import { friendlyEventLabelTitle } from '../utils/eventLabelFriendlyNames'

type ExpandableChildRowsProps = {
  metric: ExpandableMetricRow
  tsps: Tsp[]
  detailsId: string
}

function valueForLabel(
  metric: ExpandableMetricRow,
  tspId: string,
  groupId: string,
  labelIndex: number,
): number | boolean | null {
  const cell = metric.values[tspId]
  if (!cell || cell.kind !== 'expandable') {
    return null
  }
  const group = cell.groups.find((g) => g.groupId === groupId)
  if (!group) {
    return null
  }
  return group.values[labelIndex] ?? null
}

export function ExpandableChildRows({
  metric,
  tsps,
  detailsId,
}: ExpandableChildRowsProps) {
  const { groups } = metric.structure
  const isSupportMatrix = metric.kind === 'support'
  const isEventLabelsMetric = metric.id === 'metric-events-alarms'

  return (
    <>
      {groups.map((group, groupIndex) => (
        <Fragment key={`${metric.id}-${group.id}`}>
          {!isEventLabelsMetric && (
            <tr
              className="comparison-table__row comparison-table__row--group"
              {...(groupIndex === 0 ? { id: detailsId } : {})}
            >
              <th
                scope="row"
                className="comparison-table__label comparison-table__label--group"
              >
                {group.title}
              </th>
              {tsps.map((tsp) => (
                <td
                  key={tsp.id}
                  className="comparison-table__num comparison-table__num--muted"
                >
                  —
                </td>
              ))}
            </tr>
          )}
          {group.labels.map((label, labelIndex) => (
            <tr
              key={`${metric.id}-${group.id}-${label.id}`}
              className={`comparison-table__row comparison-table__row--detail${
                isEventLabelsMetric && labelIndex === 0 && groupIndex > 0
                  ? ' comparison-table__row--event-group-divider'
                  : ''
              }`}
              {...(isEventLabelsMetric && groupIndex === 0 && labelIndex === 0
                ? { id: detailsId }
                : {})}
            >
              <th
                scope="row"
                className="comparison-table__label comparison-table__label--detail"
              >
                {isEventLabelsMetric ? (
                  <span className="comparison-table__event-label-wrap">
                    <strong className="comparison-table__event-label-title">
                      {friendlyEventLabelTitle(label.id)}
                    </strong>{' '}
                    <span className="comparison-table__event-label-code">
                      ({label.id})
                    </span>
                  </span>
                ) : (
                  label.name
                )}
              </th>
              {tsps.map((tsp) => {
                const v = valueForLabel(
                  metric,
                  tsp.id,
                  group.id,
                  labelIndex,
                )

                if (isEventLabelsMetric && isSupportMatrix) {
                  if (v === null) {
                    return (
                      <td
                        key={tsp.id}
                        className="comparison-table__num comparison-table__num--support comparison-table__num--support-unavailable"
                      >
                        —
                      </td>
                    )
                  }
                  if (typeof v === 'number') {
                    if (!Number.isFinite(v)) {
                      return (
                        <td
                          key={tsp.id}
                          className="comparison-table__num comparison-table__num--ev-label comparison-table__num--label-cov-0"
                        >
                          —
                        </td>
                      )
                    }
                    if (v === 0) {
                      return (
                        <td
                          key={tsp.id}
                          className="comparison-table__num comparison-table__num--ev-label comparison-table__num--label-cov-0"
                        >
                          0%
                        </td>
                      )
                    }
                    const band = eventLabelCoverageBandClass(v)
                    return (
                      <td
                        key={tsp.id}
                        className={`comparison-table__num comparison-table__num--ev-label ${band}`}
                        title={`${v}% coverage (vehicles with label ÷ total entities)`}
                      >
                        <span className="comparison-table__ev-check" aria-hidden="true">
                          ✓
                        </span>{' '}
                        <span className="comparison-table__ev-pct">{v}%</span>
                      </td>
                    )
                  }
                  const curatedOn = v === true
                  const text = curatedOn ? '✓' : '—'
                  const cls = curatedOn
                    ? 'comparison-table__num comparison-table__num--support comparison-table__num--support-on'
                    : 'comparison-table__num comparison-table__num--support comparison-table__num--support-off'
                  return (
                    <td key={tsp.id} className={cls}>
                      {text}
                    </td>
                  )
                }

                const text = isSupportMatrix
                  ? v === true
                    ? '✓'
                    : '—'
                  : formatInteger(typeof v === 'number' ? v : null)
                const cls = isSupportMatrix
                  ? `comparison-table__num comparison-table__num--support ${
                      v === true
                        ? 'comparison-table__num--support-on'
                        : v === null
                          ? 'comparison-table__num--support-unavailable'
                          : 'comparison-table__num--support-off'
                    }`
                  : 'comparison-table__num'
                return (
                  <td key={tsp.id} className={cls}>
                    {text}
                  </td>
                )
              })}
            </tr>
          ))}
        </Fragment>
      ))}
    </>
  )
}
