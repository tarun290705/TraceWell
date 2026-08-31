export function formatDuration(durationMs) {
  if (durationMs === null || durationMs === undefined || Number.isNaN(durationMs)) {
    return '—'
  }
  if (durationMs < 1) {
    return `${Math.round(durationMs * 1000)} µs`
  }
  if (durationMs < 1000) {
    const precision = durationMs < 10 ? 2 : durationMs < 100 ? 1 : 0
    return `${durationMs.toFixed(precision)} ms`
  }
  return `${(durationMs / 1000).toFixed(2)} s`
}

export function formatTimestamp(unixSeconds) {
  if (unixSeconds === null || unixSeconds === undefined) return '—'
  const date = new Date(unixSeconds * 1000)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '—'
  const then = new Date(isoString).getTime()
  if (Number.isNaN(then)) return '—'

  const diffMs = Date.now() - then
  if (diffMs < 0) return 'just now'
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec} sec ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
}

export function shortenId(id, length = 8) {
  if (!id) return '—'
  if (id.length <= length) return id
  return `${id.slice(0, length)}…`
}