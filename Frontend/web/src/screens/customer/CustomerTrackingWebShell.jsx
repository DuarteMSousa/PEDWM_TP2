import { useEffect, useMemo, useState } from 'react'
import { LeafletTrackingMap } from '../../components/maps/LeafletTrackingMap'
import { fetchWebOrderTracking } from '../../services/trackingService'
import { subscribeToOrderTrackingTopic } from '../../services/realtime/topicsRealtime'

const DEFAULT_ORDER_ID = import.meta.env.VITE_TRACKING_ORDER_ID ?? ''
const DEFAULT_DEV_USER_ID = import.meta.env.VITE_DEV_BROADCAST_USER_ID ?? ''
const DEFAULT_TOKEN = import.meta.env.VITE_AUTH_BEARER_TOKEN ?? ''

function statusLabel(status) {
  if (status === 'PENDING') return 'Pendente'
  if (status === 'CONFIRMED') return 'Confirmado'
  if (status === 'PREPARING') return 'A preparar'
  if (status === 'READY') return 'Pronto'
  if (status === 'OUT_FOR_DELIVERY') return 'Em entrega'
  if (status === 'DELIVERED') return 'Entregue'
  if (status === 'CANCELLED') return 'Cancelado'
  return status ?? '-'
}

export function CustomerTrackingWebShell() {
  const [session, setSession] = useState(null)
  const [draft, setDraft] = useState({
    orderId: DEFAULT_ORDER_ID,
    devUserId: DEFAULT_DEV_USER_ID,
    token: DEFAULT_TOKEN,
  })
  const [tracking, setTracking] = useState(null)
  const [events, setEvents] = useState([])
  const [realtimeState, setRealtimeState] = useState('offline')
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  useEffect(() => {
    if (!session?.orderId) {
      return undefined
    }

    let unsubscribe = null

    loadTracking(session)

    try {
      unsubscribe = subscribeToOrderTrackingTopic({
        orderId: session.orderId,
        authToken: session.token,
        devUserId: session.devUserId,
        onPositionUpdated: (payload) => {
          setRealtimeState('live')
          setTracking((current) => {
            const nextLatest = {
              lat: Number(payload.lat),
              lng: Number(payload.lng),
              recorded_at: payload.recordedAt,
            }

            return {
              ...(current ?? {}),
              order_id: payload.orderId ?? current?.order_id ?? session.orderId,
              delivery_id: payload.deliveryId ?? current?.delivery_id,
              courier_id: payload.courierId ?? current?.courier_id,
              latest_position: nextLatest,
              positions: [nextLatest, ...((current?.positions ?? []).slice(0, 19))],
            }
          })

          setEvents((current) => [
            {
              event_type: payload.eventName ?? 'COURIER_POSITION_UPDATED',
              timestamp: payload.recordedAt ?? new Date().toISOString(),
            },
            ...current,
          ].slice(0, 30))
        },
        onError: () => {
          setRealtimeState('error')
        },
      })
    } catch {
      queueMicrotask(() => {
        setRealtimeState('error')
      })
    }

    const poll = setInterval(() => {
      loadTracking(session)
    }, 20000)

    return () => {
      clearInterval(poll)
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [session])

  async function loadTracking(currentSession) {
    try {
      setLoading(true)
      const data = await fetchWebOrderTracking({
        orderId: currentSession.orderId,
        token: currentSession.token,
        devUserId: currentSession.devUserId,
      })

      setTracking(data)
      setEvents(data?.events ?? [])
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  const realtimeLabel = useMemo(() => {
    if (realtimeState === 'live') return 'AO VIVO'
    if (realtimeState === 'connecting') return 'A LIGAR'
    if (realtimeState === 'error') return 'ERRO'
    return 'OFFLINE'
  }, [realtimeState])

  if (!session) {
    return (
      <section className="rb-login-wrap">
        <div className="rb-login-card">
          <h2>Tracking cliente (web)</h2>
          <p>Area web de cliente para acompanhar o pedido em tempo real.</p>
          <form
            className="rb-login-form"
            onSubmit={(event) => {
              event.preventDefault()
              setRealtimeState('connecting')
              setSession({
                orderId: draft.orderId.trim(),
                devUserId: draft.devUserId.trim(),
                token: draft.token.trim(),
              })
            }}
          >
            <label>
              Order ID
              <input
                value={draft.orderId}
                onChange={(event) => setDraft((state) => ({ ...state, orderId: event.target.value }))}
                required
              />
            </label>
            <label>
              Dev User ID (opcional)
              <input
                value={draft.devUserId}
                onChange={(event) => setDraft((state) => ({ ...state, devUserId: event.target.value }))}
              />
            </label>
            <label>
              Bearer token (opcional)
              <input
                value={draft.token}
                onChange={(event) => setDraft((state) => ({ ...state, token: event.target.value }))}
              />
            </label>
            <button type="submit" className="rb-primary">Abrir tracking</button>
          </form>
        </div>
      </section>
    )
  }

  return (
    <section className="rb-tracking-shell">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Tracking do Pedido</h2>
          <p>Estado ao vivo do pedido #{String(tracking?.order_id ?? session.orderId).slice(0, 8)}</p>
        </div>
        <div className="rb-top-actions">
          <button type="button" className="rb-icon-btn" onClick={() => loadTracking(session)}>
            {loading ? 'A atualizar...' : 'Atualizar'}
          </button>
          <button type="button" className="rb-icon-btn" onClick={() => setSession(null)}>
            Trocar pedido
          </button>
        </div>
      </header>

      <article className="rb-tracking-card">
        <h3>Status</h3>
        <div className="rb-tracking-grid">
          <p><strong>Pedido:</strong> {statusLabel(tracking?.order_status)}</p>
          <p><strong>Entrega:</strong> {tracking?.delivery_status ?? '-'}</p>
          <p><strong>Realtime:</strong> {realtimeLabel}</p>
          <p><strong>ETA:</strong> {tracking?.eta_seconds ? `${Math.ceil(tracking.eta_seconds / 60)} min` : '-'}</p>
          <p><strong>Distancia:</strong> {tracking?.distance_km_remaining ?? '-'} km</p>
          <p><strong>Restaurante:</strong> {tracking?.restaurant_name ?? '-'}</p>
        </div>
      </article>

      <LeafletTrackingMap
        pickup={
          tracking?.pickup_latitude !== null && tracking?.pickup_latitude !== undefined
            ? { lat: tracking.pickup_latitude, lng: tracking.pickup_longitude, label: 'Pickup' }
            : null
        }
        dropoff={
          tracking?.dropoff_latitude !== null && tracking?.dropoff_latitude !== undefined
            ? { lat: tracking.dropoff_latitude, lng: tracking.dropoff_longitude, label: 'Dropoff' }
            : null
        }
        courier={
          tracking?.latest_position
            ? { lat: tracking.latest_position.lat, lng: tracking.latest_position.lng, label: 'Estafeta' }
            : null
        }
        positions={tracking?.positions ?? []}
        routePoints={tracking?.route_points ?? []}
      />

      <article className="rb-tracking-card">
        <h3>Timeline</h3>
        {events.length === 0 ? <p className="rb-notif-empty">Sem eventos ainda.</p> : null}
        {events.map((event) => (
          <div key={`${event.event_type}-${event.timestamp}`} className="rb-notif-item">
            <div className="rb-notif-item-top">
              <strong>{event.event_type}</strong>
              <small>{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '-'}</small>
            </div>
          </div>
        ))}
      </article>

      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
    </section>
  )
}
