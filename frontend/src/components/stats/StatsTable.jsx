import { formatDuration } from '../../utils/formatting.js'

export default function StatsTable({ stats, loading }) {
  if (loading) {
    return (
      <table className="data-table" aria-label="Endpoint statistics">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>App</th>
            <th>Requests</th>
            <th>Avg duration</th>
            <th>Min / Max</th>
            <th>Error rate</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i} className="skeleton-row">
              {Array.from({ length: 6 }).map((_, j) => (
                <td key={j}><div className="skeleton" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (stats.length === 0) {
    return (
      <div className="empty-state">
        <p>No traced requests yet.</p>
        <p className="empty-state-hint">Stats appear here once your instrumented apps handle some requests.</p>
      </div>
    )
  }

  return (
    <table className="data-table" aria-label="Endpoint statistics">
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>App</th>
          <th>Requests</th>
          <th>Avg duration</th>
          <th>Min / Max</th>
          <th>Error rate</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => {
          const errorPct = Math.round(s.error_rate * 100)
          return (
            <tr key={`${s.app_name}-${s.name}`}>
              <td className="mono">{s.name}</td>
              <td>{s.app_name}</td>
              <td>{s.count}</td>
              <td>{formatDuration(s.avg_duration_ms)}</td>
              <td>
                {formatDuration(s.min_duration_ms)} / {formatDuration(s.max_duration_ms)}
              </td>
              <td>
                <span className={`badge ${errorPct > 0 ? 'status-error' : 'status-ok'}`}>
                  {errorPct}%
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}