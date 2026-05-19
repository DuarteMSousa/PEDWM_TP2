import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  acceptRestaurantOrder,
  cancelRestaurantOrder,
  fetchRestaurantActiveOrders,
  rejectRestaurantOrder,
} from '../../../services/restaurantOpsService'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { subscribeToRestaurantOrdersTopic } from '../../../services/realtime/topicsRealtime'

function statusLabel(status) {
  if (status === 'PENDING') return 'Pendente'
  if (status === 'CONFIRMED') return 'Confirmado'
  if (status === 'PREPARING') return 'A preparar'
  if (status === 'READY') return 'Pronto'
  if (status === 'OUT_FOR_DELIVERY') return 'Em entrega'
  return status
}

function statusTone(status) {
  if (status === 'PENDING') return 'pending'
  if (status === 'CONFIRMED' || status === 'PREPARING') return 'prep'
  if (status === 'READY' || status === 'OUT_FOR_DELIVERY') return 'done'
  return 'off'
}

function playBeep(ref) {
  try {
    if (typeof window === 'undefined') return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    if (!ref.current) {
      ref.current = new AudioContext()
    }
    const ctx = ref.current
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.35)
  } catch {
    // ignore
  }
}

export function RestaurantOrdersQueueScreen({ session, onSelectOrder, onNavigate }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [dialogLoading, setDialogLoading] = useState(false)
  const [realtimeState, setRealtimeState] = useState('offline')
  const beepRef = useRef(null)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      const stored = window.localStorage.getItem('fastbite_sound_enabled')
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem('fastbite_sound_enabled', String(soundEnabled))
    } catch {
      // ignore
    }
  }, [soundEnabled])

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const nextOrders = await fetchRestaurantActiveOrders(session)
      setOrders(nextOrders)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    queueMicrotask(() => {
      loadOrders()
    })
  }, [loadOrders])

  // Polling de fallback apenas enquanto o socket nao esta live.
  useEffect(() => {
    if (realtimeState === 'live') return undefined
    const timer = setInterval(loadOrders, 30000)
    return () => clearInterval(timer)
  }, [realtimeState, loadOrders])

  useEffect(() => {
    if (!session?.restaurantId) {
      return undefined
    }

    let unsubscribe = null
    setRealtimeState('connecting')
    try {
      unsubscribe = subscribeToRestaurantOrdersTopic({
        restaurantId: session.restaurantId,
        authToken: session.token,
        devUserId: session.devUserId,
        onEvent: (eventName) => {
          setRealtimeState('live')
          if (eventName === 'ORDER_CREATED') {
            if (soundEnabled) {
              playBeep(beepRef)
            }
            setInfoText('Novo pedido recebido.')
          }
          loadOrders()
        },
        onError: () => {
          setRealtimeState('error')
        },
      })
    } catch {
      setRealtimeState('error')
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [session?.restaurantId, session?.token, session?.devUserId, loadOrders])

  async function handleAccept(orderId) {
    try {
      setBusyOrderId(orderId)
      await acceptRestaurantOrder({ session, orderId })
      setInfoText('Encomenda aceite com sucesso.')
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
    }
  }

  function requestReject(order) {
    setRejectTarget(order)
    setRejectReason('')
  }

  function requestCancel(order) {
    setCancelTarget(order)
    setCancelReason('')
  }

  async function handleConfirmReject() {
    if (!rejectTarget) return
    try {
      setDialogLoading(true)
      setBusyOrderId(rejectTarget.order_id)
      await rejectRestaurantOrder({
        session,
        orderId: rejectTarget.order_id,
        reason: rejectReason,
      })
      setInfoText('Encomenda rejeitada.')
      setRejectTarget(null)
      setRejectReason('')
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
      setDialogLoading(false)
    }
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return
    try {
      setDialogLoading(true)
      setBusyOrderId(cancelTarget.order_id)
      await cancelRestaurantOrder({
        session,
        orderId: cancelTarget.order_id,
        reason: cancelReason,
      })
      setInfoText('Encomenda cancelada.')
      setCancelTarget(null)
      setCancelReason('')
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
      setDialogLoading(false)
    }
  }

  function handleOpenChat(orderId) {
    if (onSelectOrder) onSelectOrder(orderId)
    if (onNavigate) onNavigate('chat')
  }

  function handleOpenDetail(orderId) {
    if (onSelectOrder) onSelectOrder(orderId)
    if (onNavigate) onNavigate('order-detail')
  }

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.order_status === 'PENDING').length
    const preparing = orders.filter((order) => order.order_status === 'PREPARING').length
    const outForDelivery = orders.filter((order) => order.order_status === 'OUT_FOR_DELIVERY').length
    const totalValue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0)

    return [
      { icon: 'PD', label: 'Pendentes', value: String(pending) },
      { icon: 'PR', label: 'A preparar', value: String(preparing) },
      { icon: 'ED', label: 'Em entrega', value: String(outForDelivery) },
      { icon: 'EU', label: 'Valor ativo', value: `${totalValue.toFixed(2)} EUR` },
    ]
  }, [orders])

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Dashboard</h2>
          <p>Encomendas ativas em tempo real</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(event) => setSoundEnabled(event.target.checked)}
            />
            Som
          </label>
          <span
            className={`badge ${realtimeState === 'live' ? 'ok' : realtimeState === 'error' ? 'danger' : 'warn'}`}
          >
            {realtimeState === 'live'
              ? 'Realtime ativo'
              : realtimeState === 'connecting'
                ? 'A ligar'
                : realtimeState === 'error'
                  ? 'Realtime erro'
                  : 'Offline'}
          </span>
        </div>
      </header>

      <div className="rb-stat-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="rb-stat-card">
            <div className="rb-stat-row">
              <span className="rb-stat-icon">{stat.icon}</span>
            </div>
            <p className="rb-stat-label">{stat.label}</p>
            <p className="rb-stat-value">{stat.value}</p>
          </article>
        ))}
      </div>

      <article className="rb-table-card">
        <div className="rb-table-head">
          <h3>Encomendas ativas</h3>
          <button type="button" className="rb-btn-outline" onClick={loadOrders}>
            Atualizar
          </button>
        </div>
        <table className="rb-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Criado</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  <td colSpan={6}>
                    <div className="rb-skeleton-line" />
                  </td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="rb-empty-state">
                    <strong>Sem encomendas ativas.</strong>
                    <p>Quando entrarem novos pedidos, aparecem aqui automaticamente.</p>
                    <div className="rb-empty-actions">
                      <button type="button" className="rb-notif-filter" onClick={loadOrders}>
                        Recarregar
                      </button>
                      <button type="button" className="rb-notif-filter" onClick={() => onNavigate?.('kitchen')}>
                        Ir para Cozinha
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.order_id}>
                  <td>{String(order.order_id).slice(0, 8)}</td>
                  <td>{order.customer_name ?? String(order.customer_id).slice(0, 8)}</td>
                  <td>{Number(order.total).toFixed(2)} EUR</td>
                  <td>
                    <span className={`rb-chip ${statusTone(order.order_status)}`}>
                      {statusLabel(order.order_status)}
                    </span>
                  </td>
                  <td>{order.created_at ? new Date(order.created_at).toLocaleTimeString() : '-'}</td>
                  <td>
                    {order.order_status === 'PENDING' ? (
                      <div className="rb-kitchen-actions">
                        <button
                          type="button"
                          className="rb-btn-outline"
                          disabled={busyOrderId === order.order_id}
                          onClick={() => requestReject(order)}
                        >
                          Rejeitar
                        </button>
                        <button
                          type="button"
                          className="rb-btn-accept"
                          disabled={busyOrderId === order.order_id}
                          onClick={() => handleAccept(order.order_id)}
                        >
                          Aceitar
                        </button>
                        <button
                          type="button"
                          className="rb-btn-outline"
                          onClick={() => handleOpenDetail(order.order_id)}
                        >
                          Detalhe
                        </button>
                      </div>
                    ) : (
                      <div className="rb-kitchen-actions">
                        {['CONFIRMED', 'PREPARING'].includes(order.order_status) ? (
                          <button
                            type="button"
                            className="rb-btn-outline"
                            disabled={busyOrderId === order.order_id}
                            onClick={() => requestCancel(order)}
                          >
                            Cancelar pedido
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rb-btn-outline"
                          onClick={() => handleOpenDetail(order.order_id)}
                        >
                          Detalhe
                        </button>
                        <button
                          type="button"
                          className="rb-btn-outline"
                          onClick={() => handleOpenChat(order.order_id)}
                        >
                          Abrir chat
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {infoText ? <p className="rb-success-note">{infoText}</p> : null}
        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </article>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Rejeitar encomenda"
        description="O motivo e usado em auditoria e notifica o cliente."
        confirmLabel="Rejeitar"
        destructive
        loading={dialogLoading}
        onCancel={() => {
          if (!dialogLoading) {
            setRejectTarget(null)
            setRejectReason('')
          }
        }}
        onConfirm={handleConfirmReject}
      >
        <label>
          Motivo (opcional)
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Ex: rutura de stock, capacidade excedida"
            disabled={dialogLoading}
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar encomenda ja aceite"
        description="O cliente recebera notificacao de cancelamento. Indica o motivo (opcional)."
        confirmLabel="Cancelar encomenda"
        destructive
        loading={dialogLoading}
        onCancel={() => {
          if (!dialogLoading) {
            setCancelTarget(null)
            setCancelReason('')
          }
        }}
        onConfirm={handleConfirmCancel}
      >
        <label>
          Motivo (opcional)
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Ex: problema com fornecedor"
            disabled={dialogLoading}
          />
        </label>
      </ConfirmDialog>
    </section>
  )
}
