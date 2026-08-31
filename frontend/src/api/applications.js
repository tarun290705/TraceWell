import { request } from './client.js'

export function getApplications() {
  return request('/api/apps/')
}