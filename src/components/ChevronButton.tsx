type ChevronButtonProps = {
  expanded: boolean
  onClick: () => void
  controlsId: string
  label: string
}

export function ChevronButton({
  expanded,
  onClick,
  controlsId,
  label,
}: ChevronButtonProps) {
  return (
    <button
      type="button"
      className="chevron-button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
    >
      <span className="chevron-button__icon" aria-hidden>
        {expanded ? '▾' : '▸'}
      </span>
    </button>
  )
}
