import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

const REVERB_APP_KEY = import.meta.env.VITE_REVERB_APP_KEY ?? ''
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1'
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT ?? 8080)
const REVERB_SCHEME = import.meta.env.VITE_REVERB_SCHEME ?? 'http'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const DEV_BROADCAST_USER_ID = import.meta.env.VITE_DEV_BROADCAST_USER_ID ?? ''

let echoInstance = null
let currentToken = null

function buildAuthHeaders(authToken) {
  const headers = { Accept: 'application/json' }

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }

  if (DEV_BROADCAST_USER_ID) {
    headers['X-Dev-User-Id'] = DEV_BROADCAST_USER_ID
  }

  return headers
}

export function getEchoClient({ authToken } = {}) {
  if (!REVERB_APP_KEY) {
    throw new Error('Missing VITE_REVERB_APP_KEY.')
  }

  if (echoInstance && currentToken === authToken) {
    return echoInstance
  }

  if (echoInstance) {
    echoInstance.disconnect()
  }

  window.Pusher = Pusher

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${API_BASE_URL}/broadcasting/auth`,
    auth: {
      headers: buildAuthHeaders(authToken),
    },
  })

  currentToken = authToken ?? null
  return echoInstance
}

export function disconnectEchoClient() {
  if (!echoInstance) return
  echoInstance.disconnect()
  echoInstance = null
  currentToken = null
}
