import { buildAuthHeaders, graphqlRequest } from './apiClient'

const ORDER_CHATS_QUERY = `
  query GetChatsByOrderId($orderId: ID!) {
    getChatsByOrderId(order_id: $orderId) {
      id
      order_id
      type
      closed_at
      participants {
        id
        user_id
        user_type
      }
      messages {
        id
        chat_id
        sender_participant_id
        content
        timestamp
      }
    }
  }
`

const CREATE_ORDER_CHAT_MUTATION = `
  mutation CreateOrderChat($input: CreateOrderChatInput!) {
    createOrderChat(input: $input) {
      id
      order_id
      type
      closed_at
      participants {
        id
        user_id
        user_type
      }
      messages {
        id
        chat_id
        sender_participant_id
        content
        timestamp
      }
    }
  }
`

const SEND_MESSAGE_MUTATION = `
  mutation SendChatMessage($input: SendMessageInput!) {
    sendChatMessage(input: $input) {
      id
      chat_id
      sender_participant_id
      content
      timestamp
    }
  }
`

function requestHeaders(session) {
  return buildAuthHeaders({
    token: session?.token,
    devUserId: session?.devUserId,
  })
}

function mapChat(chat) {
  const participantsById = new Map(
    (chat.participants ?? []).map((participant) => [participant.id, participant]),
  )

  const messages = (chat.messages ?? [])
    .map((message) => {
      const senderParticipant = participantsById.get(message.sender_participant_id)
      return {
        id: message.id,
        chat_id: message.chat_id,
        content: message.content,
        sender_participant_id: message.sender_participant_id,
        sender_user_id: senderParticipant?.user_id ?? 'desconhecido',
        timestamp: message.timestamp,
      }
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  return {
    id: chat.id,
    order_id: chat.order_id,
    type: chat.type,
    closed_at: chat.closed_at,
    participants: chat.participants ?? [],
    messages,
  }
}

export async function fetchOrderChats({ session, orderId }) {
  const data = await graphqlRequest({
    query: ORDER_CHATS_QUERY,
    variables: { orderId },
    headers: requestHeaders(session),
  })

  return (data.getChatsByOrderId ?? []).map(mapChat)
}

export async function createOrderChat({
  session,
  orderId,
  participantUserIds,
  type = 'CUSTOMER_RESTAURANT',
}) {
  const uniqueParticipantUserIds = Array.from(
    new Set((participantUserIds ?? []).filter(Boolean)),
  )

  if (uniqueParticipantUserIds.length < 2) {
    throw new Error('O chat precisa de pelo menos dois participantes.')
  }

  const data = await graphqlRequest({
    query: CREATE_ORDER_CHAT_MUTATION,
    variables: {
      input: {
        order_id: orderId,
        type,
        participant_user_ids: uniqueParticipantUserIds,
      },
    },
    headers: requestHeaders(session),
  })

  return mapChat(data.createOrderChat)
}

export async function sendChatMessage({ session, chatId, content }) {
  const senderUserId = session?.userId || session?.devUserId

  if (!senderUserId) {
    throw new Error('Define User ID para enviar mensagem.')
  }

  const data = await graphqlRequest({
    query: SEND_MESSAGE_MUTATION,
    variables: {
      input: {
        chat_id: chatId,
        sender_user_id: senderUserId,
        content,
      },
    },
    headers: requestHeaders(session),
  })

  return {
    id: data.sendChatMessage.id,
    chat_id: data.sendChatMessage.chat_id,
    content: data.sendChatMessage.content,
    sender_participant_id: data.sendChatMessage.sender_participant_id,
    sender_user_id: senderUserId,
    timestamp: data.sendChatMessage.timestamp,
  }
}
