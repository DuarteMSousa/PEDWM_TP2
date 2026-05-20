import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchOperatorNotifications,
  markAllOperatorNotificationsRead,
  markOperatorNotificationRead,
} from '../../../services/restaurantOpsService'
import { subscribeToUserNotificationsTopic } from '../../../services/realtime/topicsRealtime'

const MAX_ITEMS = 40

const TYPE_META = {
  ORDER_UPDATE: { label: 'Pedido', icon: '🍽', tone: 'amber' },
  PAYMENT_UPDATE: { label: 'Pagamento', icon: '💳', tone: 'blue' },
  DELIVERY_UPDATE: { label: 'Entrega', icon: '🛵', tone: 'blue' },
  PROMOTION: { label: 'Promoção', icon: '🎁', tone: 'green' },
  SYSTEM: { label: 'Sistema', icon: '⚙', tone: 'slate' },
  INFO: { label: 'Info', icon: 'ℹ', tone: 'slate' },
}

function getTypeMeta(type) {
  return TYPE_META[type] ?? { label: type ?? 'Info', icon: 'ℹ', tone: 'slate' }
}

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

function dateGroupKey(timestamp) {
  if (!timestamp) return 'older'
  const ts = new Date(timestamp).getTime()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000
  if (ts >= todayStart) return 'today'
  if (ts >= yesterdayStart) return 'yesterday'
  if (ts >= weekStart) return 'week'
  return 'older'
}

const GROUP_LABELS = {
  today: 'Hoje',
  yesterday: 'Ontem',
  week: 'Esta semana',
  older: 'Antes',
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RestaurantNotificationsScreen({ session }) {
  const [status, setStatus] = useState('offline')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const visibleItems = useMemo(
    () => (showUnreadOnly ? items.filter((item) => !item.read) : items),
    [items, showUnreadOnly],
  )

  const groupedItems = useMemo(() => {
    const groups = { today: [], yesterday: [], week: [], older: [] }
    visibleItems.forEach((item) => {
      groups[dateGroupKey(item.timestamp)].push(item)
    })
    return groups
  }, [visibleItems])

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
    const unsubscribe = subscribeToUserNotificationsTopic({
      userId: session.userId,
      authToken: session.token,
      devUserId: session.devUserId,
      onSubscribed: () => setStatus('live'),
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
      },
    })

    return () => {
      unsubscribe()
    }
  }, [session.devUserId, session.token, session.userId])

  async function handleMarkOneRead(id) {
    try {
      setSaving(true)
      await markOperatorNotificationRead({ session, notificationId: id })
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true, read_at: new Date().toISOString() } : item,
        ),
      )
      setInfoText('Notificacao marcada como lida.')
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
      setInfoText('Todas as notificacoes foram marcadas como lidas.')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Notificacoes</h2>
          <p>Atualizacoes em tempo real sobre pedidos, entregas e operacoes.</p>
        </div>
        <div className={`rb-realtime-pill rb-realtime-${status}`}>
          <span className="rb-realtime-dot" />
          <strong>
            {status === 'live' ? 'Realtime ativo' : status === 'error' ? 'Realtime offline' : 'A ligar...'}
          </strong>
        </div>
      </header>

      <article className="rb-notif-summary">
        <div className="rb-notif-summary-count">
          <strong>{unreadCount}</strong>
          <span>{unreadCount === 1 ? 'notificacao por ler' : 'notificacoes por ler'}</span>
        </div>
        <div className="rb-notif-summary-actions">
          <button
            type="button"
            className={`rb-filter ${showUnreadOnly ? 'active' : ''}`}
            onClick={() => setShowUnreadOnly((current) => !current)}
          >
            {showUnreadOnly ? 'Mostrar todas' : 'Mostrar so nao lidas'}
          </button>
          <button
            type="button"
            className="rb-btn-outline rb-btn-small"
            onClick={handleMarkAllRead}
            disabled={saving || unreadCount === 0}
          >
            Marcar tudo como lida
          </button>
        </div>
      </article>

      {loading && items.length === 0 ? <p>A carregar notificacoes...</p> : null}

      {!loading && visibleItems.length === 0 ? (
        <article className="rb-empty-state">
          <p className="rb-empty-icon">📭</p>
          <h3>{showUnreadOnly ? 'Nada por ler' : 'Sem notificacoes'}</h3>
          <p>
            {showUnreadOnly
              ? 'Todas as notificacoes ja foram lidas.'
              : 'Quando houver atualizacoes, vao aparecer aqui em tempo real.'}
          </p>
        </article>
      ) : null}

      {Object.entries(GROUP_LABELS).map(([key, label]) => {
        const groupItems = groupedItems[key]
        if (!groupItems || groupItems.length === 0) return null
        return (
          <div className="rb-notif-group" key={key}>
            <h4 className="rb-notif-group-title">{label}</h4>
            <div className="rb-notif-list">
              {groupItems.map((item) => {
                const meta = getTypeMeta(item.type)
                return (
                  <div className={`rb-notif-card ${item.read ? 'read' : 'unread'}`} key={item.id}>
                    <div className={`rb-notif-icon rb-notif-icon-${meta.tone}`}>
                      <span>{meta.icon}</span>
                    </div>
                    <div className="rb-notif-body">
                      <div className="rb-notif-body-top">
                        <strong>{item.title}</strong>
                        <small>{formatTime(item.timestamp)}</small>
                      </div>
                      <p>{item.message}</p>
                      <div className="rb-notif-body-foot">
                        <span className={`rb-notif-tag rb-notif-tag-${meta.tone}`}>{meta.label}</span>
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
                          <small className="rb-notif-read-tag">Lida</small>
                        )}
                      </div>
                    </div>
                    {!item.read ? <span className="rb-notif-dot" aria-label="Nao lida" /> : null}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {infoText ? <p className="rb-success-note">{infoText}</p> : null}
      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
    </section>
  )
}
