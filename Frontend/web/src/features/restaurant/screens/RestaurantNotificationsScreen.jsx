import { useEffect, useMemo, useState } from 'react'
import { subscribeToUserNotificationsTopic } from '../../../services/realtime/topicsRealtime'
import { disconnectEchoClient } from '../../../services/realtime/echoClient'

const DEFAULT_USER_ID = import.meta.env.VITE_REALTIME_USER_ID ?? ''
const MAX_ITEMS = 40

function normalizeNotification(payload) {
  return {
    id: payload?.eventId ?? payload?.notificationId ?? `${Date.now()}-${Math.random()}`,
    type: payload?.type ?? 'INFO',
    title: payload?.title ?? 'Nova notificacao',
    message: payload?.message ?? 'Sem descricao',
    timestamp: payload?.sentAt ?? new Date().toISOString(),
    read: false,
  }
}

export function RestaurantNotificationsScreen() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [status, setStatus] = useState('offline')
  const [isListening, setIsListening] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [items, setItems] = useState([])
  const [errorText, setErrorText] = useState('')

  const canConnect = useMemo(() => Boolean(userId.trim()), [userId])
  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const visibleItems = useMemo(
    () => (showUnreadOnly ? items.filter((item) => !item.read) : items),
    [items, showUnreadOnly],
  )

  useEffect(() => {
    if (!isListening) {
      return undefined
    }

    const unsubscribe = subscribeToUserNotificationsTopic({
      userId: userId.trim(),
      onNotification: (payload) => {
        setStatus('live')
        setErrorText('')
        setItems((current) => [normalizeNotification(payload), ...current].slice(0, MAX_ITEMS))
      },
      onError: () => {
        setStatus('error')
        setErrorText('Erro no canal privado. Confirma auth do utilizador.')
      },
    })

    return () => {
      unsubscribe()
      disconnectEchoClient()
    }
  }, [isListening, userId])

  function handleToggleConnection() {
    if (isListening) {
      setIsListening(false)
      setStatus('offline')
      return
    }

    if (!canConnect) {
      setStatus('missing-config')
      setErrorText('Preenche User ID para abrir o canal de notificacoes.')
      return
    }

    setStatus('connecting')
    setErrorText('')
    setIsListening(true)
  }

  function handleMarkOneRead(id) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  function handleMarkAllRead() {
    setItems((current) => current.map((item) => ({ ...item, read: true })))
  }

  const statusLabel =
    status === 'live'
      ? 'Ao vivo'
      : status === 'connecting'
        ? 'A ligar'
        : status === 'missing-config'
          ? 'Falta user ID'
          : status === 'error'
            ? 'Erro'
            : 'Offline'

  const statusClass = status === 'live' ? 'ok' : status === 'error' ? 'danger' : 'warn'

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>Notificacoes do Utilizador</h2>
        <p>Inbox dedicada ao topico `user.{`{userId}`}.notifications` com triagem de leitura.</p>
      </header>

      <div className="uc-row">
        {['UC15', 'UC21'].map((uc) => (
          <span key={uc} className="uc-pill">
            {uc}
          </span>
        ))}
      </div>

      <section className="rb-notif">
        <div className="rb-notif-head">
          <div>
            <h3>Canal pessoal de notificacoes</h3>
            <p>
              Estado: <strong>{unreadCount}</strong> nao lidas
            </p>
          </div>
          <span className={`badge ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="rb-notif-config">
          <label>
            User ID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
          <button type="button" className="rb-primary" onClick={handleToggleConnection}>
            {isListening ? 'Desligar canal' : 'Ligar canal'}
          </button>
        </div>

        <div className="rb-notif-actions">
          <button
            type="button"
            className={`rb-notif-filter ${showUnreadOnly ? 'active' : ''}`}
            onClick={() => setShowUnreadOnly((current) => !current)}
          >
            {showUnreadOnly ? 'Mostrar todas' : 'Mostrar nao lidas'}
          </button>
          <button type="button" className="rb-notif-filter" onClick={handleMarkAllRead}>
            Marcar tudo como lida
          </button>
        </div>

        <article className="rb-notif-list">
          {visibleItems.length === 0 ? (
            <p className="rb-notif-empty">Sem notificacoes para mostrar.</p>
          ) : (
            visibleItems.map((item) => (
              <div className={`rb-notif-item ${item.read ? 'read' : 'unread'}`} key={item.id}>
                <div className="rb-notif-item-top">
                  <strong>{item.title}</strong>
                  <span className={`rb-chip ${item.read ? 'off' : 'pending'}`}>{item.type}</span>
                </div>
                <p>{item.message}</p>
                <div className="rb-notif-item-foot">
                  <small>{item.timestamp}</small>
                  {!item.read ? (
                    <button type="button" className="rb-link-btn" onClick={() => handleMarkOneRead(item.id)}>
                      Marcar lida
                    </button>
                  ) : (
                    <small>Lida</small>
                  )}
                </div>
              </div>
            ))
          )}
        </article>

        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </section>
    </section>
  )
}

