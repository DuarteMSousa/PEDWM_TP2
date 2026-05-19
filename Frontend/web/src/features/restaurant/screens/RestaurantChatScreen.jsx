import { useCallback, useEffect, useMemo, useState } from 'react'
import { createOrderChat, fetchOrderChats, sendChatMessage } from '../../../services/chatService'
import {
  fetchRestaurantActiveOrders,
  fetchRestaurantOrdersHistory,
} from '../../../services/restaurantOpsService'
import { subscribeToChatTopic } from '../../../services/realtime/topicsRealtime'
import { disconnectEchoClient } from '../../../services/realtime/echoClient'

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

export function RestaurantChatScreen({ session, selectedOrderId, onSelectOrder }) {
  const [orders, setOrders] = useState([])
  const [orderId, setOrderId] = useState(selectedOrderId ?? '')
  const [chat, setChat] = useState(null)
  const [status, setStatus] = useState('offline')
  const [isListening, setIsListening] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorText, setErrorText] = useState('')
  const effectiveOrderId = selectedOrderId || orderId

  const selectedOrder = useMemo(
    () => orders.find((order) => order.order_id === effectiveOrderId) ?? null,
    [effectiveOrderId, orders],
  )

  const canSend = useMemo(() => Boolean(chat?.id && messageText.trim()), [chat?.id, messageText])

  const loadOrders = useCallback(async () => {
    try {
      // Carrega tanto encomendas ativas como historico recente para nao perder o chat
      // depois da entrega/cancelamento.
      const [activeOrders, recentHistory] = await Promise.all([
        fetchRestaurantActiveOrders(session),
        fetchRestaurantOrdersHistory({
          session,
          statuses: ['DELIVERED', 'CANCELLED'],
          page: 1,
          perPage: 30,
        }),
      ])

      const seen = new Set()
      const merged = []
      for (const order of [...activeOrders, ...recentHistory]) {
        if (!order?.order_id || seen.has(order.order_id)) continue
        seen.add(order.order_id)
        merged.push(order)
      }

      setOrders(merged)
      setErrorText('')
      if (!effectiveOrderId && merged.length > 0) {
        const fallbackOrderId = merged[0].order_id
        setOrderId(fallbackOrderId)
        if (onSelectOrder) onSelectOrder(fallbackOrderId)
      }
    } catch (error) {
      setErrorText(error.message)
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
        setMessages((activeChat?.messages ?? []).slice(-MAX_ITEMS))
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
    if (!isListening || !chat?.id) {
      return undefined
    }

    const unsubscribe = subscribeToChatTopic({
      chatId: chat.id,
      authToken: session.token,
      devUserId: session.devUserId,
      onMessage: (payload) => {
        setStatus('live')
        setErrorText('')
        setMessages((current) => [normalizeEventMessage(payload), ...current].slice(0, MAX_ITEMS))
      },
      onError: () => {
        setStatus('error')
        setErrorText('Erro no canal privado. Confirma auth e participacao no chat.')
      },
    })

    return () => {
      unsubscribe()
      disconnectEchoClient()
    }
  }, [chat?.id, isListening, session.devUserId, session.token])

  async function handleCreateChat() {
    if (!selectedOrder) {
      setErrorText('Seleciona uma encomenda para abrir chat.')
      return
    }

    const participantUserIds = [session.userId, selectedOrder.customer_id, selectedOrder.courier_id].filter(Boolean)

    try {
      setSaving(true)
      const createdChat = await createOrderChat({
        session,
        orderId: selectedOrder.order_id,
        participantUserIds,
      })
      setChat(createdChat)
      setMessages((createdChat.messages ?? []).slice(-MAX_ITEMS))
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  function handleToggleConnection() {
    if (isListening) {
      setIsListening(false)
      setStatus('offline')
      return
    }

    if (!chat?.id) {
      setStatus('missing-config')
      setErrorText('Cria ou seleciona chat para abrir o canal realtime.')
      return
    }

    setStatus('connecting')
    setErrorText('')
    setIsListening(true)
  }

  async function handleSendMessage(event) {
    event.preventDefault()

    if (!canSend) {
      return
    }

    const content = messageText.trim()
    setMessageText('')

    try {
      const response = await sendChatMessage({
        session,
        chatId: chat.id,
        content,
      })

      setErrorText('')
      setMessages((current) => [{ ...response, source: 'mutation' }, ...current].slice(0, MAX_ITEMS))
    } catch (error) {
      setErrorText(error.message)
      setMessageText(content)
    }
  }

  const statusLabel =
    status === 'live'
      ? 'Ao vivo'
      : status === 'connecting'
        ? 'A ligar'
        : status === 'missing-config'
          ? 'Sem chat'
          : status === 'error'
            ? 'Erro'
            : 'Offline'

  const statusClass = status === 'live' ? 'ok' : status === 'error' ? 'danger' : 'warn'

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>Chat Operacional</h2>
        <p>Canal por encomenda entre restaurante, cliente e estafeta.</p>
      </header>

      <div className="uc-row">
        {['UC09', 'UC14'].map((uc) => (
          <span key={uc} className="uc-pill">
            {uc}
          </span>
        ))}
      </div>

      <section className="rb-chat">
        <div className="rb-chat-head">
          <div>
            <h3>Chat da encomenda</h3>
            <p>{selectedOrder ? orderLabel(selectedOrder) : 'Seleciona uma encomenda ativa.'}</p>
          </div>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="rb-chat-config">
          <label>
            Encomenda
            <select
              value={effectiveOrderId}
              onChange={(event) => {
                setOrderId(event.target.value)
                if (onSelectOrder) onSelectOrder(event.target.value)
              }}
            >
              <option value="">Selecionar encomenda</option>
              {orders.map((order) => (
                <option value={order.order_id} key={order.order_id}>
                  {orderLabel(order)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Chat ID
            <input value={chat?.id ?? ''} disabled placeholder="Sem chat criado" />
          </label>
          <button type="button" className="rb-primary" onClick={handleToggleConnection}>
            {isListening ? 'Desligar canal' : 'Ligar canal'}
          </button>
        </div>

        <div className="rb-notif-actions">
          <button
            type="button"
            className="rb-notif-filter"
            onClick={() => loadOrderChat(effectiveOrderId)}
            disabled={loading}
          >
            {loading ? 'A carregar...' : 'Atualizar mensagens'}
          </button>
          <button
            type="button"
            className="rb-notif-filter"
            onClick={handleCreateChat}
            disabled={saving || !effectiveOrderId}
          >
            {saving ? 'A criar...' : 'Criar chat da encomenda'}
          </button>
        </div>

        <article className="rb-chat-stream">
          <h4>Mensagens</h4>
          {messages.length === 0 ? (
            <p className="rb-chat-empty">Sem mensagens ainda para esta encomenda.</p>
          ) : (
            messages.map((message) => (
              <div className="rb-chat-item" key={message.id}>
                <strong>{message.content}</strong>
                <span>sender: {message.sender_user_id ?? 'desconhecido'}</span>
                <small>
                  {message.timestamp} - via {message.source ?? 'graphql'}
                </small>
              </div>
            ))
          )}
        </article>

        <form className="rb-chat-compose" onSubmit={handleSendMessage}>
          <label>
            Mensagem
            <textarea
              rows={3}
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Escreve aqui a tua mensagem..."
            />
          </label>
          <button type="submit" className="rb-primary" disabled={!canSend}>
            Enviar mensagem
          </button>
        </form>

        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </section>
    </section>
  )
}
