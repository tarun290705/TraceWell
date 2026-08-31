import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTrace } from '../api/traces.js'
import { ApiError } from '../api/client.js'
import TraceHeader from '../components/trace/TraceHeader.jsx'
import TraceTree from '../components/trace/TraceTree.jsx'
import TraceFlowChart from '../components/trace/TraceFlowChart.jsx'
import TraceWaterfall from '../components/trace/TraceWaterfall.jsx'
import SpanDetails from '../components/trace/SpanDetails.jsx'
import { buildTraceTree, flattenTree } from '../utils/traceTree.js'
import { computeTimeline } from '../utils/timeline.js'
import { computeFlowLayout } from '../utils/flowLayout.js'

export default function TraceDetailsPage() {
  const { traceId } = useParams()
  const [spans, setSpans] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSpanId, setSelectedSpanId] = useState(null)
  const [viewMode, setViewMode] = useState('tree') // 'tree' | 'flow'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSelectedSpanId(null)

    getTrace(traceId)
      .then((data) => {
        if (cancelled) return
        setSpans(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [traceId])

  const { roots, orphanCount } = useMemo(() => buildTraceTree(spans || []), [spans])
  const flat = useMemo(() => flattenTree(roots), [roots])
  const orderedSpans = useMemo(() => flat.map((entry) => entry.span), [flat])
  const timeline = useMemo(() => computeTimeline(orderedSpans), [orderedSpans])
  const flowLayout = useMemo(() => computeFlowLayout(roots), [roots])

  const rootSpan = roots[0]
  const selectedSpan = useMemo(
    () => (spans || []).find((s) => s.span_id === selectedSpanId) || null,
    [spans, selectedSpanId]
  )

  if (loading) {
    return (
      <div className="page">
        <p className="empty-state-hint">Loading trace…</p>
      </div>
    )
  }

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <div className="page">
        <div className="error-banner">
          {notFound ? (
            <p>Trace not found.</p>
          ) : (
            <>
              <p>Unable to connect to the TraceWell collector.</p>
              <p className="empty-state-hint">Make sure the collector is running at http://localhost:8000</p>
            </>
          )}
        </div>
        <p>
          <Link to="/traces">Back to traces</Link>
        </p>
      </div>
    )
  }

  if (!spans || spans.length === 0 || !rootSpan) {
    return (
      <div className="page">
        <div className="empty-state">
          <p>Trace not found.</p>
        </div>
        <p>
          <Link to="/traces">Back to traces</Link>
        </p>
      </div>
    )
  }

  const summaryTrace = {
    trace_id: traceId,
    root_name: rootSpan.name,
    app_name: rootSpan.app_name,
    status: rootSpan.status,
    duration_ms: rootSpan.duration_ms,
    start_time: rootSpan.start_time,
  }

  return (
    <div className="page trace-details-page">
      <p>
        <Link to="/traces">← Back to traces</Link>
      </p>

      <TraceHeader trace={summaryTrace} spanCount={spans.length} />

      <section className="waterfall-section">
        <TraceWaterfall entries={timeline.entries} selectedSpanId={selectedSpanId} onSelect={setSelectedSpanId} />
      </section>

      <section className="trace-body">
        <div className="trace-tree-panel">
          <div className="tree-panel-header">
            <h2>Execution {viewMode === 'flow' ? 'Flow' : 'Tree'}</h2>
            <div className="view-toggle" role="group" aria-label="Execution view mode">
              <button
                type="button"
                className={`toggle-btn${viewMode === 'tree' ? ' active' : ''}`}
                aria-pressed={viewMode === 'tree'}
                onClick={() => setViewMode('tree')}
              >
                Tree
              </button>
              <button
                type="button"
                className={`toggle-btn${viewMode === 'flow' ? ' active' : ''}`}
                aria-pressed={viewMode === 'flow'}
                onClick={() => setViewMode('flow')}
              >
                Flow
              </button>
            </div>
          </div>

          {viewMode === 'tree' ? (
            <TraceTree
              roots={roots}
              selectedSpanId={selectedSpanId}
              onSelect={setSelectedSpanId}
              orphanCount={orphanCount}
            />
          ) : (
            <TraceFlowChart layout={flowLayout} selectedSpanId={selectedSpanId} onSelect={setSelectedSpanId} />
          )}
        </div>
        <div className="span-details-panel">
          <SpanDetails span={selectedSpan} />
        </div>
      </section>
    </div>
  )
}