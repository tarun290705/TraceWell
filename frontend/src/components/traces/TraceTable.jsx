import { useNavigate } from 'react-router-dom'
import TraceStatus from './TraceStatus.jsx'
import { formatDuration, formatTimestamp, shortenId } from '../../utils/formatting.js'

export default function TraceTable({ traces, loading, hasFilters }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <table className="data-table" aria-label="Traces">
        <thead>
          <tr>
            <th>Trace ID</th>
            <th>Application</th>
            <th>Root Operation</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Start Time</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="skeleton-row">
              <td><div className="skeleton" /></td>
              <td><div className="skeleton" /></td>
              <td><div className="skeleton" /></td>
              <td><div className="skeleton" /></td>
              <td><div className="skeleton" /></td>
              <td><div className="skeleton" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (traces.length === 0) {
    return (
      <div className="empty-state">
        {hasFilters ? (
          <p>No traces match the current filters.</p>
        ) : (
          <>
            <p>No traces recorded yet.</p>
            <p className="empty-state-hint">Trigger an API request in a connected application.</p>
          </>
        )}
      </div>
    )
  }

  return (
    <table className="data-table" aria-label="Traces">
      <thead>
        <tr>
          <th>Trace ID</th>
          <th>Application</th>
          <th>Root Operation</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Start Time</th>
        </tr>
      </thead>
      <tbody>
        {traces.map((trace) => (
          <tr
            key={trace.trace_id}
            className="clickable-row"
            tabIndex={0}
            role="link"
            onClick={() => navigate(`/traces/${encodeURIComponent(trace.trace_id)}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/traces/${encodeURIComponent(trace.trace_id)}`)
              }
            }}
          >
            <td className="mono" title={trace.trace_id}>
              {shortenId(trace.trace_id, 10)}
            </td>
            <td>{trace.app_name || '—'}</td>
            <td>{trace.root_name || '—'}</td>
            <td>
              <TraceStatus status={trace.status} />
            </td>
            <td>
              {formatDuration(trace.duration_ms)}
              {trace.is_anomalous && (
                <span
                  className="badge status-warning"
                  style={{ marginLeft: 6 }}
                  title="Duration exceeds this endpoint's typical range (mean + 2 standard deviations)"
                >
                  Slow
                </span>
              )}
            </td>
            <td>{formatTimestamp(trace.start_time)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}