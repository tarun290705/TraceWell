import { useCallback, useEffect, useRef, useState } from 'react'
import { getApplications } from '../api/applications.js'

const POLL_INTERVAL_MS = 5000

export function useApplications() {
  const [applications, setApplications] = useState([])
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
      const data = await getApplications()
      setApplications(Array.isArray(data) ? data : [])
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
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  return { applications, loading, refreshing, error, refresh: load }
}