import { memo } from 'react'
import { formatDuration } from '../../utils/formatting.js'

function TraceWaterfall({ entries, selectedSpanId, onSelect }) {
  if (!entries || entries.length === 0) {
    return <p className="empty-state-hint">No timing data available for this trace.</p>
  }

  return (
    <div className="waterfall" role="table" aria-label="Trace timeline">
      <div className="waterfall-header" role="row">
        <span className="waterfall-col-name" role="columnheader">
          Operation
        </span>
        <span className="waterfall-col-bar" role="columnheader">
          Timeline
        </span>
        <span className="waterfall-col-duration" role="columnheader">
          Duration
        </span>
      </div>
      <div className="waterfall-body">
        {entries.map(({ span, offsetPercent, widthPercent }) => {
          const isSelected = span.span_id === selectedSpanId
          return (
            <button
              type="button"
              key={span.span_id}
              role="row"
              className={`waterfall-row${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(span.span_id)}
              title={`${span.name || 'unnamed span'} — ${formatDuration(span.duration_ms)} — ${
                span.status || 'unknown'
              }`}
            >
              <span className="waterfall-col-name" role="cell">
                {span.name || 'unnamed span'}
              </span>
              <span className="waterfall-col-bar" role="cell">
                <span className="waterfall-track">
                  <span
                    className={`waterfall-bar status-bar-${(span.status || 'unknown').toLowerCase()}`}
                    style={{ left: `${offsetPercent}%`, width: `${widthPercent}%` }}
                  />
                </span>
              </span>
              <span className="waterfall-col-duration" role="cell">
                {formatDuration(span.duration_ms)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default memo(TraceWaterfall)