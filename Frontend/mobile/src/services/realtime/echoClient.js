import Echo from 'laravel-echo'
import Pusher from 'pusher-js/react-native'

const REVERB_APP_KEY = process.env.EXPO_PUBLIC_REVERB_APP_KEY ?? ''
const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST ?? '127.0.0.1'
const REVERB_PORT = Number(process.env.EXPO_PUBLIC_REVERB_PORT ?? 8080)
const REVERB_SCHEME = process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'http'
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
const DEV_BROADCAST_USER_ID = process.env.EXPO_PUBLIC_DEV_BROADCAST_USER_ID ?? ''

let echoInstance = null
let currentToken = null

function buildAuthHeaders(authToken) {
  const headers = {}

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
    headers.Accept = 'application/json'
  }

  if (DEV_BROADCAST_USER_ID) {
    headers['X-Dev-User-Id'] = DEV_BROADCAST_USER_ID
  }

  return headers
}

export function getEchoClient({ authToken } = {}) {
  if (!REVERB_APP_KEY) {
    throw new Error('Missing EXPO_PUBLIC_REVERB_APP_KEY.')
  }

  if (echoInstance && currentToken === authToken) {
    return echoInstance
  }

  if (echoInstance) {
    echoInstance.disconnect()
  }

  global.Pusher = Pusher

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
  if (!echoInstance) {
    return
  }

  echoInstance.disconnect()
  echoInstance = null
  currentToken = null
}
