import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTraces } from '../hooks/useTraces.js'
import { useApplications } from '../hooks/useApplications.js'
import TraceFilters from '../components/traces/TraceFilters.jsx'
import TraceTable from '../components/traces/TraceTable.jsx'

export default function TracesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [polling, setPolling] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [search, setSearch] = useState('')

  const selectedApp = searchParams.get('app') || ''

  const { applications } = useApplications()
  const { traces, loading, refreshing, error, refresh } = useTraces({ polling })

  const setSelectedApp = (appName) => {
    const next = new URLSearchParams(searchParams)
    if (appName) {
      next.set('app', appName)
    } else {
      next.delete('app')
    }
    setSearchParams(next)
  }

  const filteredTraces = useMemo(() => {
    const query = search.trim().toLowerCase()
    return traces.filter((trace) => {
      if (selectedApp && trace.app_name !== selectedApp) return false
      if (selectedStatus && (trace.status || '').toLowerCase() !== selectedStatus) return false
      if (query) {
        const haystack = `${trace.trace_id} ${trace.app_name} ${trace.root_name}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [traces, selectedApp, selectedStatus, search])

  const hasFilters = Boolean(selectedApp || selectedStatus || search.trim())

  return (
    <div className="page">
      <div className="page-header">
        <h1>Traces</h1>
        <label className="polling-toggle">
          <input type="checkbox" checked={polling} onChange={(e) => setPolling(e.target.checked)} />
          Auto-refresh every 15s
        </label>
      </div>

      <TraceFilters
        applications={applications}
        selectedApp={selectedApp}
        onAppChange={setSelectedApp}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        search={search}
        onSearchChange={setSearch}
        onRefresh={refresh}
        refreshing={refreshing}
      />

      {error ? (
        <div className="error-banner">
          <p>Unable to connect to the TraceWell collector.</p>
          <p className="empty-state-hint">Make sure the collector is running at http://localhost:8000</p>
        </div>
      ) : (
        <TraceTable traces={filteredTraces} loading={loading} hasFilters={hasFilters} />
      )}
    </div>
  )
}