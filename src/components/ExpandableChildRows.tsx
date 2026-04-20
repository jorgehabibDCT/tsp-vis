import { Fragment } from 'react'
import type { ExpandableMetricRow, Tsp } from '../types/dashboard'
import { formatInteger } from '../utils/format'

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

  return (
    <>
      {groups.map((group, groupIndex) => (
        <Fragment key={`${metric.id}-${group.id}`}>
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
          {group.labels.map((label, labelIndex) => (
            <tr
              key={`${metric.id}-${group.id}-${label.id}`}
              className="comparison-table__row comparison-table__row--detail"
            >
              <th
                scope="row"
                className="comparison-table__label comparison-table__label--detail"
              >
                {label.name}
              </th>
              {tsps.map((tsp) => {
                const v = valueForLabel(
                  metric,
                  tsp.id,
                  group.id,
                  labelIndex,
                )
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
