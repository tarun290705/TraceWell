const BASE_URL = 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message, { status, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.cause = cause
  }
}

export async function request(path, options = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch (err) {
    throw new ApiError('Unable to connect to the TraceWell collector.', { cause: err })
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError('The requested resource was not found.', { status: 404 })
    }
    throw new ApiError(`The TraceWell collector returned an error (status ${response.status}).`, {
      status: response.status,
    })
  }

  try {
    return await response.json()
  } catch (err) {
    throw new ApiError('The TraceWell collector returned an unexpected response.', { cause: err })
  }
}

export { BASE_URL }