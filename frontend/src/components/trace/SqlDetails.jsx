import { formatDuration } from '../../utils/formatting.js'

export default function SqlDetails({ span }) {
  const metadata = span.metadata || {}
  const statement = metadata.statement || metadata.query || metadata.sql || null

  const isSqlLike = /sql|query|db/i.test(span.name || '') || Boolean(statement)
  if (!isSqlLike) return null

  return (
    <section className="sql-details">
      <h3>Database Query</h3>
      {statement ? (
        <pre className="sql-statement">
          <code>{statement}</code>
        </pre>
      ) : (
        <p className="empty-state-hint">No SQL statement was provided for this span.</p>
      )}
      <dl className="sql-meta">
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(span.duration_ms)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{span.status || '—'}</dd>
        </div>
      </dl>
    </section>
  )
}