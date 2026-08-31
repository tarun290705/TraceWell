import StatsTable from '../components/stats/StatsTable.jsx'
import { useStats } from '../hooks/useStats.js'

export default function StatsPage() {
  const { stats, loading, error } = useStats()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Endpoint stats</h1>
          <p className="empty-state-hint">Aggregate performance across every traced endpoint, ranked slowest-first</p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>Could not load stats.</p>
          <p className="empty-state-hint">{error.message || 'Check that the collector is running.'}</p>
        </div>
      )}

      <StatsTable stats={stats} loading={loading} />
    </div>
  )
}