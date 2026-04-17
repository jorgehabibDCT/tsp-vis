type DashboardErrorStateProps = {
  message: string
  onRetry: () => void
}

export function DashboardErrorState({
  message,
  onRetry,
}: DashboardErrorStateProps) {
  return (
    <div className="dashboard-status dashboard-status--error" role="alert">
      <p className="dashboard-status__title">Couldn’t load dashboard</p>
      <p className="dashboard-status__detail">{message}</p>
      <button type="button" className="dashboard-status__retry" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
