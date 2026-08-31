export default function TraceFilters({
  applications,
  selectedApp,
  onAppChange,
  selectedStatus,
  onStatusChange,
  search,
  onSearchChange,
  onRefresh,
  refreshing,
}) {
  return (
    <div className="trace-filters">
      <div className="filter-field">
        <label htmlFor="app-filter">Application</label>
        <select id="app-filter" value={selectedApp} onChange={(e) => onAppChange(e.target.value)}>
          <option value="">All Applications</option>
          {applications.map((app) => (
            <option key={app.app_name} value={app.app_name}>
              {app.app_name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label htmlFor="status-filter">Status</label>
        <select id="status-filter" value={selectedStatus} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="">All</option>
          <option value="ok">OK</option>
          <option value="error">Error</option>
          <option value="in_progress">In Progress</option>
        </select>
      </div>

      <div className="filter-field filter-field-grow">
        <label htmlFor="trace-search">Search</label>
        <input
          id="trace-search"
          type="search"
          placeholder="Trace ID, application, or operation"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}