import { useEffect, useMemo, useState } from 'react'
import { subscribeToChatTopic } from '../../../services/realtime/topicsRealtime'
import { disconnectEchoClient } from '../../../services/realtime/echoClient'
import { sendChatMessage } from '../../../services/chatService'

const DEFAULT_CHAT_ID = import.meta.env.VITE_REALTIME_CHAT_ID ?? ''
const DEFAULT_USER_ID = import.meta.env.VITE_REALTIME_USER_ID ?? ''
const MAX_ITEMS = 30

function normalizeEventMessage(payload) {
  return {
    id: payload?.eventId ?? `${Date.now()}-${Math.random()}`,
    content: payload?.content ?? 'Mensagem recebida',
    sender: payload?.senderUserId ?? 'desconhecido',
    timestamp: payload?.timestamp ?? new Date().toISOString(),
    source: 'socket',
  }
}

export function RestaurantChatScreen() {
  const [chatId, setChatId] = useState(DEFAULT_CHAT_ID)
  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [status, setStatus] = useState('offline')
  const [isListening, setIsListening] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [messages, setMessages] = useState([])
  const [errorText, setErrorText] = useState('')

  const canConnect = useMemo(() => chatId.trim() && userId.trim(), [chatId, userId])
  const canSend = useMemo(() => chatId.trim() && messageText.trim(), [chatId, messageText])

  useEffect(() => {
    if (!isListening) {
      return undefined
    }

    const unsubscribe = subscribeToChatTopic({
      chatId: chatId.trim(),
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
  }, [chatId, isListening])

  function handleToggleConnection() {
    if (isListening) {
      setIsListening(false)
      setStatus('offline')
      return
    }

    if (!canConnect) {
      setStatus('missing-config')
      setErrorText('Preenche Chat ID e User ID para abrir o canal.')
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
        chatId: chatId.trim(),
        content,
      })

      setErrorText('')

      setMessages((current) =>
        [
          {
            id: response?.message_id ?? `${Date.now()}-${Math.random()}`,
            content,
            sender: userId || 'eu',
            timestamp: response?.sent_at ?? new Date().toISOString(),
            source: 'mutation',
          },
          ...current,
        ].slice(0, MAX_ITEMS),
      )
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
          ? 'Faltam IDs'
          : status === 'error'
            ? 'Erro'
            : 'Offline'

  const statusClass = status === 'live' ? 'ok' : status === 'error' ? 'danger' : 'warn'

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>Chat Operacional</h2>
        <p>Sala dedicada para mensagens em tempo real entre participantes de um pedido.</p>
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
            <h3>Canal `chat.{chatId}`</h3>
            <p>Subscreve o topico e envia mensagem pelo backend GraphQL.</p>
          </div>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="rb-chat-config">
          <label>
            Chat ID
            <input value={chatId} onChange={(event) => setChatId(event.target.value)} />
          </label>
          <label>
            User ID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
          <button type="button" className="rb-primary" onClick={handleToggleConnection}>
            {isListening ? 'Desligar canal' : 'Ligar canal'}
          </button>
        </div>

        <article className="rb-chat-stream">
          <h4>Mensagens recebidas</h4>
          {messages.length === 0 ? (
            <p className="rb-chat-empty">Sem mensagens ainda. Liga o canal e envia uma mensagem.</p>
          ) : (
            messages.map((message) => (
              <div className="rb-chat-item" key={message.id}>
                <strong>{message.content}</strong>
                <span>sender: {message.sender}</span>
                <small>
                  {message.timestamp} - via {message.source}
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

