import { request } from './client.js'

export function getTraces() {
  return request('/api/traces/')
}

export function getTrace(traceId) {
  return request(`/api/traces/${encodeURIComponent(traceId)}/`)
}