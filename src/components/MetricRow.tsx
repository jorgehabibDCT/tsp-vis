import type { MetricRow as MetricRowType, Tsp } from '../types/dashboard'
import { ExpandableChildRows } from './ExpandableChildRows'
import { ExpandableMetricRow } from './ExpandableMetricRow'
import { ScalarCellsRow } from './ScalarCellsRow'

type MetricRowProps = {
  metric: MetricRowType
  tsps: Tsp[]
  expanded: boolean
  onToggleExpandable: () => void
}

export function MetricRow({
  metric,
  tsps,
  expanded,
  onToggleExpandable,
}: MetricRowProps) {
  if (metric.type === 'scalar') {
    return <ScalarCellsRow metric={metric} tsps={tsps} />
  }

  const detailsId = `${metric.id}-details`

  return (
    <>
      <ExpandableMetricRow
        metric={metric}
        tsps={tsps}
        expanded={expanded}
        onToggle={onToggleExpandable}
        detailsId={detailsId}
      />
      {expanded && (
        <ExpandableChildRows metric={metric} tsps={tsps} detailsId={detailsId} />
      )}
    </>
  )
}
