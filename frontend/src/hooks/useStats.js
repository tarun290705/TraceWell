import { useCallback, useEffect, useRef, useState } from 'react'
import { getStats } from '../api/stats.js'

const POLL_INTERVAL_MS = 5000

export function useStats() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isFirstLoad = useRef(true)

  const load = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true)
    setError(null)
    try {
      const data = await getStats()
      setStats(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
      isFirstLoad.current = false
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  return { stats, loading, error, refresh: load }
}