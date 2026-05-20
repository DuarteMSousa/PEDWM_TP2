import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createOrderChat, fetchOrderChats, sendChatMessage } from '../../../services/chatService'
import {
  fetchRestaurantActiveOrders,
  fetchRestaurantOrdersHistory,
} from '../../../services/restaurantOpsService'
import { subscribeToChatTopic } from '../../../services/realtime/topicsRealtime'

const MAX_ITEMS = 50

function normalizeEventMessage(payload) {
  return {
    id: payload?.eventId ?? `${Date.now()}-${Math.random()}`,
    content: payload?.content ?? 'Mensagem recebida',
    sender_user_id: payload?.senderUserId ?? 'desconhecido',
    timestamp: payload?.timestamp ?? new Date().toISOString(),
    source: 'socket',
  }
}

function orderLabel(order) {
  const shortId = String(order.order_id).slice(0, 8)
  return `#${shortId} - ${order.customer_name ?? order.customer_id}`
}

function formatMessageTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

function formatDayHeader(timestamp) {
  const date = new Date(timestamp)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)
  if (date >= todayStart) return 'Hoje'
  if (date >= yesterdayStart) return 'Ontem'
  return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })
}

export function RestaurantChatScreen({ session, selectedOrderId, onSelectOrder }) {
  const [orders, setOrders] = useState([])
  const [orderId, setOrderId] = useState(selectedOrderId ?? '')
  const [chat, setChat] = useState(null)
  const [status, setStatus] = useState('offline')
  const [messageText, setMessageText] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorText, setErrorText] = useState('')
  const streamRef = useRef(null)

  const effectiveOrderId = selectedOrderId || orderId

  const selectedOrder = useMemo(
    () => orders.find((order) => order.order_id === effectiveOrderId) ?? null,
    [effectiveOrderId, orders],
  )

  const orderIsCancelled = selectedOrder?.order_status === 'CANCELLED'
  const ownUserId = session.userId
  const canSend = useMemo(
    () => Boolean(chat?.id && messageText.trim() && !orderIsCancelled),
    [chat?.id, messageText, orderIsCancelled],
  )

  // Ordem cronologica ascendente (mais antiga em cima, mais nova em baixo)
  function sortMessagesAsc(list) {
    return [...list].sort((a, b) => {
      const ta = new Date(a?.timestamp ?? 0).getTime()
      const tb = new Date(b?.timestamp ?? 0).getTime()
      return ta - tb
    })
  }

  const loadOrders = useCallback(async () => {
    const [activeResult, historyResult] = await Promise.allSettled([
      fetchRestaurantActiveOrders(session),
      fetchRestaurantOrdersHistory({
        session,
        statuses: ['DELIVERED', 'CANCELLED'],
        page: 1,
        perPage: 30,
      }),
    ])

    const activeOrders = activeResult.status === 'fulfilled' ? activeResult.value : []
    const recentHistory = historyResult.status === 'fulfilled' ? historyResult.value : []
    const firstError =
      activeResult.status === 'rejected'
        ? activeResult.reason
        : historyResult.status === 'rejected'
          ? historyResult.reason
          : null

    const seen = new Set()
    const merged = []
    for (const order of [...activeOrders, ...recentHistory]) {
      if (!order?.order_id || seen.has(order.order_id)) continue
      seen.add(order.order_id)
      merged.push(order)
    }

    setOrders(merged)
    setErrorText(firstError ? firstError.message : '')
    if (!effectiveOrderId && merged.length > 0) {
      const fallbackOrderId = merged[0].order_id
      setOrderId(fallbackOrderId)
      if (onSelectOrder) onSelectOrder(fallbackOrderId)
    }
  }, [effectiveOrderId, onSelectOrder, session])

  const loadOrderChat = useCallback(
    async (targetOrderId) => {
      if (!targetOrderId) {
        setChat(null)
        setMessages([])
        return
      }

      try {
        setLoading(true)
        const chats = await fetchOrderChats({ session, orderId: targetOrderId })
        const activeChat = chats[0] ?? null
        setChat(activeChat)
        setMessages(sortMessagesAsc(activeChat?.messages ?? []).slice(-MAX_ITEMS))
        setErrorText('')
      } catch (error) {
        setErrorText(error.message)
      } finally {
        setLoading(false)
      }
    },
    [session],
  )

  useEffect(() => {
    queueMicrotask(() => {
      loadOrders()
    })
  }, [loadOrders])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrderChat(effectiveOrderId)
    }, 0)

    return () => {
      clearTimeout(timer)
    }
  }, [effectiveOrderId, loadOrderChat])

  useEffect(() => {
    if (!chat?.id || !selectedOrder?.courier_id) return
    const participantIds = new Set((chat.participants ?? []).map((p) => p.user_id))
    if (participantIds.has(selectedOrder.courier_id)) return
    loadOrderChat(effectiveOrderId)
  }, [chat?.id, chat?.participants, selectedOrder?.courier_id, effectiveOrderId, loadOrderChat])

  // Realtime: subscreve automaticamente quando ha chat ativo
  useEffect(() => {
    if (!chat?.id) {
      setStatus('offline')
      return undefined
    }

    setStatus('connecting')
    const unsubscribe = subscribeToChatTopic({
      chatId: chat.id,
      authToken: session.token,
      devUserId: session.devUserId,
      onSubscribed: () => setStatus('live'),
      onMessage: (payload) => {
        setStatus('live')
        setErrorText('')
        setMessages((current) =>
          sortMessagesAsc([...current, normalizeEventMessage(payload)]).slice(-MAX_ITEMS),
        )
      },
      onError: () => {
        setStatus('error')
      },
    })

    return () => {
      unsubscribe()
    }
  }, [chat?.id, session.devUserId, session.token])

  // Auto scroll para o fim quando chegam mensagens novas
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight
    }
  }, [messages.length])

  async function handleCreateChat() {
    if (!selectedOrder) {
      setErrorText('Seleciona uma encomenda para abrir chat.')
      return
    }

    const participantUserIds = [
      session.userId,
      selectedOrder.customer_id,
      selectedOrder.courier_id,
    ].filter(Boolean)

    try {
      setSaving(true)
      const createdChat = await createOrderChat({
        session,
        orderId: selectedOrder.order_id,
        participantUserIds,
      })
      setChat(createdChat)
      setMessages(sortMessagesAsc(createdChat.messages ?? []).slice(-MAX_ITEMS))
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault()

    if (!canSend) return

    const content = messageText.trim()
    setMessageText('')

    try {
      const response = await sendChatMessage({
        session,
        chatId: chat.id,
        content,
      })

      setErrorText('')
      setMessages((current) =>
        sortMessagesAsc([...current, { ...response, source: 'mutation' }]).slice(-MAX_ITEMS),
      )
    } catch (error) {
      setErrorText(error.message)
      setMessageText(content)
    }
  }

  // Agrupar mensagens por dia (para mostrar "Hoje", "Ontem", "5 de maio")
  const messageGroups = useMemo(() => {
    const groups = []
    let currentGroup = null
    messages.forEach((message) => {
      const dayLabel = formatDayHeader(message.timestamp)
      if (!currentGroup || currentGroup.day !== dayLabel) {
        currentGroup = { day: dayLabel, items: [] }
        groups.push(currentGroup)
      }
      currentGroup.items.push(message)
    })
    return groups
  }, [messages])

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Chat</h2>
          <p>Comunica directamente com o cliente e o estafeta de cada encomenda.</p>
        </div>
        {chat?.id ? (
          <div className={`rb-realtime-pill rb-realtime-${status}`}>
            <span className="rb-realtime-dot" />
            <strong>
              {status === 'live'
                ? 'Realtime ativo'
                : status === 'error'
                  ? 'Realtime offline'
                  : 'A ligar...'}
            </strong>
          </div>
        ) : null}
      </header>

      <article className="rb-chat-shell">
        <header className="rb-chat-shell-head">
          <label className="rb-chat-order-select">
            <span>Encomenda</span>
            <select
              value={effectiveOrderId}
              onChange={(event) => {
                setOrderId(event.target.value)
                if (onSelectOrder) onSelectOrder(event.target.value)
              }}
            >
              <option value="">Selecionar encomenda...</option>
              {orders.map((order) => (
                <option value={order.order_id} key={order.order_id}>
                  {orderLabel(order)}
                </option>
              ))}
            </select>
          </label>
          {selectedOrder ? (
            <div className="rb-chat-order-meta">
              <span className={`rb-chip ${selectedOrder.order_status === 'CANCELLED' ? 'off' : 'done'}`}>
                {selectedOrder.order_status}
              </span>
              <small>{Number(selectedOrder.total ?? 0).toFixed(2)} EUR</small>
            </div>
          ) : null}
        </header>

        {!effectiveOrderId ? (
          <div className="rb-empty-state rb-empty-state-inline">
            <p className="rb-empty-icon">💬</p>
            <h3>Escolhe uma encomenda</h3>
            <p>Seleciona uma encomenda em cima para abrir o chat.</p>
          </div>
        ) : loading && !chat ? (
          <p style={{ padding: 20 }}>A carregar chat...</p>
        ) : !chat?.id ? (
          <div className="rb-empty-state rb-empty-state-inline">
            <p className="rb-empty-icon">💬</p>
            <h3>Sem chat ativo</h3>
            <p>Cria um canal de conversa para esta encomenda.</p>
            <button
              type="button"
              className="rb-btn-accept rb-btn-small"
              onClick={handleCreateChat}
              disabled={saving}
            >
              {saving ? 'A criar...' : 'Criar chat'}
            </button>
          </div>
        ) : (
          <>
            <div className="rb-chat-stream-new" ref={streamRef}>
              {messageGroups.length === 0 ? (
                <div className="rb-chat-empty-stream">
                  <p>Ainda nao ha mensagens.</p>
                  <small>Inicia a conversa enviando uma mensagem em baixo.</small>
                </div>
              ) : (
                messageGroups.map((group, groupIdx) => (
                  <div className="rb-chat-day-group" key={`${group.day}-${groupIdx}`}>
                    <div className="rb-chat-day-divider">
                      <span>{group.day}</span>
                    </div>
                    {group.items.map((message, idx) => {
                      const isOwn = message.sender_user_id === ownUserId
                      const prev = group.items[idx - 1]
                      const showSenderTag =
                        !isOwn && (!prev || prev.sender_user_id !== message.sender_user_id)
                      return (
                        <div
                          className={`rb-chat-bubble-row ${isOwn ? 'own' : 'other'}`}
                          key={message.id}
                        >
                          <div className="rb-chat-bubble">
                            {showSenderTag ? (
                              <span className="rb-chat-bubble-sender">
                                {String(message.sender_user_id).slice(0, 8)}
                              </span>
                            ) : null}
                            <p>{message.content}</p>
                            <small>{formatMessageTime(message.timestamp)}</small>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            <form className="rb-chat-compose-new" onSubmit={handleSendMessage}>
              <textarea
                rows={1}
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder={
                  orderIsCancelled
                    ? 'Chat encerrado: encomenda cancelada.'
                    : 'Escreve uma mensagem...'
                }
                disabled={orderIsCancelled}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSendMessage(event)
                  }
                }}
              />
              <button type="submit" className="rb-chat-send-btn" disabled={!canSend}>
                Enviar
              </button>
            </form>
          </>
        )}
      </article>

      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
    </section>
  )
}
