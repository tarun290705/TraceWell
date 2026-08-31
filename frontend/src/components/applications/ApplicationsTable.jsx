import { useNavigate } from 'react-router-dom'
import ApplicationStatus from './ApplicationStatus.jsx'
import { formatRelativeTime } from '../../utils/formatting.js'

export default function ApplicationsTable({ applications, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <table className="data-table" aria-label="Connected applications">
        <thead>
          <tr>
            <th>Application</th>
            <th>Framework</th>
            <th>Status</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 4 }).map((_, i) => (
            <tr key={i} className="skeleton-row">
              <td>
                <div className="skeleton" />
              </td>
              <td>
                <div className="skeleton" />
              </td>
              <td>
                <div className="skeleton" />
              </td>
              <td>
                <div className="skeleton" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="empty-state">
        <p>No applications connected.</p>
        <p className="empty-state-hint">
          Start a TraceWell-instrumented application to see it appear here.
        </p>
      </div>
    )
  }

  const goToTraces = (appName) => {
    navigate(`/traces?app=${encodeURIComponent(appName)}`)
  }

  return (
    <table className="data-table" aria-label="Connected applications">
      <thead>
        <tr>
          <th>Application</th>
          <th>Framework</th>
          <th>Status</th>
          <th>Last Seen</th>
        </tr>
      </thead>
      <tbody>
        {applications.map((app) => (
          <tr key={app.app_name}>
            <td>
              <button type="button" className="link-button" onClick={() => goToTraces(app.app_name)}>
                {app.app_name}
              </button>
            </td>
            <td>{app.framework || '—'}</td>
            <td>
              <ApplicationStatus isConnected={app.is_connected} />
            </td>
            <td>{formatRelativeTime(app.last_seen)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}