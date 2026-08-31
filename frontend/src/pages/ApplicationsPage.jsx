import { useApplications } from '../hooks/useApplications.js'
import ApplicationsTable from '../components/applications/ApplicationsTable.jsx'

export default function ApplicationsPage() {
  const { applications, loading, refreshing, error, refresh } = useApplications()

  return (
    <div className="page">
      <div className="page-header">
        <h1>Applications</h1>
        <button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error ? (
        <div className="error-banner">
          <p>Unable to connect to the TraceWell collector.</p>
          <p className="empty-state-hint">Make sure the collector is running at http://localhost:8000</p>
        </div>
      ) : (
        <ApplicationsTable applications={applications} loading={loading} />
      )}
    </div>
  )
}