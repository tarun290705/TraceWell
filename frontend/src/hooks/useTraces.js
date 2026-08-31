import { useCallback, useEffect, useRef, useState } from 'react'
import { getTraces } from '../api/traces.js'

const POLL_INTERVAL_MS = 15000

export function useTraces({ polling = false } = {}) {
  const [traces, setTraces] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const isFirstLoad = useRef(true)

  const load = useCallback(async () => {
    if (isFirstLoad.current) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError(null)

    try {
      const data = await getTraces()
      setTraces(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
      isFirstLoad.current = false
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Optional lightweight polling. Disabled by default; the caller
  // controls it via the `polling` flag (see the "Auto-refresh" toggle
  // on the Traces page). Only one interval is ever active at a time.
  useEffect(() => {
    if (!polling) return undefined
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [polling, load])

  return { traces, loading, refreshing, error, refresh: load }
}