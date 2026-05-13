const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const DEV_BROADCAST_USER_ID = import.meta.env.VITE_DEV_BROADCAST_USER_ID ?? ''
const AUTH_TOKEN = import.meta.env.VITE_AUTH_BEARER_TOKEN ?? ''

function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (AUTH_TOKEN) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`
  }

  if (DEV_BROADCAST_USER_ID) {
    headers['X-Dev-User-Id'] = DEV_BROADCAST_USER_ID
  }

  return headers
}

export async function sendChatMessage({ chatId, content }) {
  const mutation = `
    mutation SendChatMessage($input: SendChatMessageInput!) {
      sendChatMessage(input: $input) {
        ok
        chat_id
        message_id
        sent_at
      }
    }
  `

  const response = await fetch(`${API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          chat_id: chatId,
          content,
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status} ao enviar mensagem.`)
  }

  const payload = await response.json()

  if (payload.errors?.length) {
    throw new Error(payload.errors[0]?.message ?? 'Erro GraphQL ao enviar mensagem.')
  }

  return payload.data?.sendChatMessage
}

