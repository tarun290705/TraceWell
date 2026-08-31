import { request } from './client.js'

export function getStats() {
  return request('/api/stats/')
}