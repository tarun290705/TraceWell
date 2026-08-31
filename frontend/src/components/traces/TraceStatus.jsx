export default function TraceStatus({ status }) {
  const normalized = (status || '').toLowerCase()

  const label =
    normalized === 'ok'
      ? 'OK'
      : normalized === 'error'
        ? 'Error'
        : normalized === 'in_progress' || normalized === 'in-progress'
          ? 'In Progress'
          : status || 'Unknown'

  const className =
    normalized === 'ok'
      ? 'status-ok'
      : normalized === 'error'
        ? 'status-error'
        : normalized === 'in_progress' || normalized === 'in-progress'
          ? 'status-progress'
          : 'status-unknown'

  return <span className={`badge ${className}`}>{label}</span>
}