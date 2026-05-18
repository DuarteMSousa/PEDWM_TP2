import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchOperatorNotifications,
  markAllOperatorNotificationsRead,
  markOperatorNotificationRead,
} from '../../../services/restaurantOpsService'
import { subscribeToUserNotificationsTopic } from '../../../services/realtime/topicsRealtime'
import { disconnectEchoClient } from '../../../services/realtime/echoClient'

const MAX_ITEMS = 40

function normalizeNotification(payload) {
  return {
    id: payload?.notificationId ?? payload?.eventId ?? `${Date.now()}-${Math.random()}`,
    type: payload?.type ?? 'INFO',
    title: payload?.title ?? 'Nova notificacao',
    message: payload?.message ?? 'Sem descricao',
    timestamp: payload?.sentAt ?? new Date().toISOString(),
    read: false,
    read_at: null,
  }
}

export function RestaurantNotificationsScreen({ session }) {
  const [status, setStatus] = useState('offline')
  const [isListening, setIsListening] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorText, setErrorText] = useState('')

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const visibleItems = useMemo(
    () => (showUnreadOnly ? items.filter((item) => !item.read) : items),
    [items, showUnreadOnly],
  )

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchOperatorNotifications({
        session,
        unreadOnly: false,
        limit: MAX_ITEMS,
      })
      setItems(data)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    queueMicrotask(() => {
      loadNotifications()
    })
  }, [loadNotifications])

  useEffect(() => {
    if (!isListening) {
      return undefined
    }

    const unsubscribe = subscribeToUserNotificationsTopic({
      userId: session.userId,
      authToken: session.token,
      devUserId: session.devUserId,
      onNotification: (payload) => {
        setStatus('live')
        setErrorText('')
        setItems((current) => {
          const next = [normalizeNotification(payload), ...current]
          const uniqueById = Array.from(new Map(next.map((item) => [item.id, item])).values())
          return uniqueById.slice(0, MAX_ITEMS)
        })
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
  }, [isListening, session.devUserId, session.token, session.userId])

  function handleToggleConnection() {
    if (isListening) {
      setIsListening(false)
      setStatus('offline')
      return
    }

    setStatus('connecting')
    setErrorText('')
    setIsListening(true)
  }

  async function handleMarkOneRead(id) {
    try {
      setSaving(true)
      await markOperatorNotificationRead({ session, notificationId: id })
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true, read_at: new Date().toISOString() } : item,
        ),
      )
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkAllRead() {
    try {
      setSaving(true)
      await markAllOperatorNotificationsRead({ session })
      const nowIso = new Date().toISOString()
      setItems((current) => current.map((item) => ({ ...item, read: true, read_at: item.read_at ?? nowIso })))
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  const statusLabel =
    status === 'live'
      ? 'Ao vivo'
      : status === 'connecting'
        ? 'A ligar'
        : status === 'error'
          ? 'Erro'
          : 'Offline'

  const statusClass = status === 'live' ? 'ok' : status === 'error' ? 'danger' : 'warn'

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>Notificacoes do Operador</h2>
        <p>Inbox persistida com leitura/sincronizacao via backend e canal realtime.</p>
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
            <input value={session.userId} disabled />
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
          <button type="button" className="rb-notif-filter" onClick={loadNotifications} disabled={loading}>
            {loading ? 'A carregar...' : 'Atualizar'}
          </button>
          <button type="button" className="rb-notif-filter" onClick={handleMarkAllRead} disabled={saving}>
            Marcar tudo como lida
          </button>
        </div>

        <article className="rb-notif-list">
          {!loading && visibleItems.length === 0 ? (
            <p className="rb-notif-empty">Sem notificacoes para mostrar.</p>
          ) : null}
          {visibleItems.map((item) => (
            <div className={`rb-notif-item ${item.read ? 'read' : 'unread'}`} key={item.id}>
              <div className="rb-notif-item-top">
                <strong>{item.title}</strong>
                <span className={`rb-chip ${item.read ? 'off' : 'pending'}`}>{item.type}</span>
              </div>
              <p>{item.message}</p>
              <div className="rb-notif-item-foot">
                <small>{item.timestamp}</small>
                {!item.read ? (
                  <button
                    type="button"
                    className="rb-link-btn"
                    onClick={() => handleMarkOneRead(item.id)}
                    disabled={saving}
                  >
                    Marcar lida
                  </button>
                ) : (
                  <small>Lida</small>
                )}
              </div>
            </div>
          ))}
        </article>

        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </section>
    </section>
  )
}
