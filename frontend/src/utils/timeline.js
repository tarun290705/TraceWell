export function computeTimeline(spans) {
  if (!Array.isArray(spans) || spans.length === 0) {
    return { entries: [], traceStart: 0, traceDuration: 0 }
  }

  const startTimes = spans.map((s) => s.start_time).filter((t) => typeof t === 'number')
  const endTimes = spans
    .map((s) => (typeof s.end_time === 'number' ? s.end_time : (s.start_time ?? 0) + (s.duration_ms ?? 0) / 1000))
    .filter((t) => typeof t === 'number')

  const traceStart = startTimes.length ? Math.min(...startTimes) : 0
  const traceEnd = endTimes.length ? Math.max(...endTimes) : traceStart
  const traceDuration = Math.max(traceEnd - traceStart, 0.000001)

  const entries = spans.map((span) => {
    const spanStart = typeof span.start_time === 'number' ? span.start_time : traceStart
    const spanEnd = typeof span.end_time === 'number' ? span.end_time : spanStart + (span.duration_ms ?? 0) / 1000

    const relativeStart = Math.max(spanStart - traceStart, 0)
    const relativeEnd = Math.max(spanEnd - traceStart, relativeStart)

    return {
      span,
      relativeStart,
      relativeEnd,
      offsetPercent: (relativeStart / traceDuration) * 100,
      widthPercent: Math.max(((relativeEnd - relativeStart) / traceDuration) * 100, 0.4),
    }
  })

  return { entries, traceStart, traceDuration: traceDuration * 1000 }
}