import { useState } from 'react'
import TraceStatus from '../traces/TraceStatus.jsx'
import { formatDuration, formatTimestamp, shortenId } from '../../utils/formatting.js'

export default function TraceHeader({ trace, spanCount }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trace.trace_id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access may be unavailable in some environments; fail silently.
    }
  }

  return (
    <header className="trace-header">
      <h1 className="trace-header-title">{trace.root_name || 'Unnamed operation'}</h1>
      <p className="trace-header-path">{trace.app_name} → {trace.root_name}</p>
      <dl className="trace-header-meta">
        <div>
          <dt>Trace ID</dt>
          <dd className="mono" title={trace.trace_id}>
            <span>{expanded ? trace.trace_id : shortenId(trace.trace_id, 12)}</span>
            <button type="button" className="text-button" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
            <button type="button" className="text-button" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </dd>
        </div>
        <div>
          <dt>Application</dt>
          <dd>{trace.app_name || '—'}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <TraceStatus status={trace.status} />
          </dd>
        </div>
        <div>
          <dt>Total Duration</dt>
          <dd>{formatDuration(trace.duration_ms)}</dd>
        </div>
        <div>
          <dt>Spans</dt>
          <dd>{spanCount}</dd>
        </div>
        <div>
          <dt>Start Time</dt>
          <dd>{formatTimestamp(trace.start_time)}</dd>
        </div>
      </dl>
    </header>
  )
}