const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const AUTH_TOKEN = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN ?? ''

function buildBaseHeaders(headers = {}) {
  const merged = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  }

  if (!merged.Authorization && AUTH_TOKEN) {
    merged.Authorization = `Bearer ${AUTH_TOKEN}`
  }

  return merged
}

export function buildAuthHeaders({ devUserId, token } = {}) {
  const headers = {}

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (devUserId) {
    headers['X-Dev-User-Id'] = devUserId
  }

  return headers
}

export async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: buildBaseHeaders(options.headers ?? {}),
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json()
}

export async function graphqlRequest({ query, variables = {}, headers = {} }) {
  const response = await fetch(`${API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: buildBaseHeaders(headers),
    body: JSON.stringify({ query, variables }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}`)
  }

  const payload = await response.json()

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'GraphQL request failed.')
  }

  return payload.data
}
