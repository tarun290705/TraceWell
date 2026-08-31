import TraceStatus from '../traces/TraceStatus.jsx'
import SqlDetails from './SqlDetails.jsx'
import { formatDuration, formatTimestamp } from '../../utils/formatting.js'

function MetadataValue({ value }) {
  if (value === null || value === undefined) {
    return <span className="metadata-empty">—</span>
  }
  if (typeof value === 'object') {
    return (
      <pre className="metadata-json">
        <code>{JSON.stringify(value, null, 2)}</code>
      </pre>
    )
  }
  return <span>{String(value)}</span>
}

function MetadataList({ metadata }) {
  if (!metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
    return <p className="empty-state-hint">No metadata was provided for this span.</p>
  }

  return (
    <dl className="metadata-list">
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className="metadata-row">
          <dt>{key}</dt>
          <dd>
            <MetadataValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export default function SpanDetails({ span }) {
  if (!span) {
    return (
      <div className="span-details empty-state">
        <p>Select a span to see its details.</p>
      </div>
    )
  }

  return (
    <div className="span-details">
      <h2>Span Details</h2>

      <dl className="span-summary">
        <div>
          <dt>Name</dt>
          <dd>{span.name || '—'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <TraceStatus status={span.status} />
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(span.duration_ms)}</dd>
        </div>
        <div>
          <dt>Start Time</dt>
          <dd>{formatTimestamp(span.start_time)}</dd>
        </div>
        <div>
          <dt>End Time</dt>
          <dd>{formatTimestamp(span.end_time)}</dd>
        </div>
        <div>
          <dt>Parent Span</dt>
          <dd className="mono">{span.parent_span_id || 'None (root span)'}</dd>
        </div>
      </dl>

      <SqlDetails span={span} />

      <section className="span-metadata">
        <h3>Metadata</h3>
        <MetadataList metadata={span.metadata} />
      </section>
    </div>
  )
}