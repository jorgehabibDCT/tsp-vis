export function DashboardLoadingState() {
  return (
    <div className="dashboard-status dashboard-status--loading" role="status">
      <p className="dashboard-status__title">Loading dashboard…</p>
      <div className="dashboard-status__bar" aria-hidden />
    </div>
  )
}
