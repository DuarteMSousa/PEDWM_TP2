import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  acceptRestaurantOrder,
  cancelRestaurantOrder,
  fetchRestaurantActiveOrders,
  markRestaurantOrderReady,
  rejectRestaurantOrder,
  startPreparingRestaurantOrder,
  updateOrderItemStatus,
} from '../../../services/restaurantOpsService'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { useAutoToast } from '../../../components/common/ToastProvider'
import { subscribeToRestaurantOrdersTopic } from '../../../services/realtime/topicsRealtime'
import { formatEventType } from '../../../utils/orderEventLabel'

function mapOrderTone(status) {
  if (status === 'PENDING') return 'pending'
  if (status === 'CONFIRMED' || status === 'PREPARING') return 'prep'
  if (status === 'READY') return 'done'
  return 'off'
}

function mapItemTone(status) {
  if (status === 'PENDING') return 'pending'
  if (status === 'PREPARING') return 'prep'
  if (status === 'READY') return 'done'
  return 'off'
}

function mapStatusLabel(status) {
  if (status === 'PENDING') return 'Pendente'
  if (status === 'CONFIRMED') return 'Confirmado'
  if (status === 'PREPARING') return 'A preparar'
  if (status === 'READY') return 'Pronto'
  if (status === 'CANCELLED') return 'Cancelado'
  return status
}

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString()
}

function playKitchenBeep(ref) {
  try {
    if (typeof window === 'undefined') return
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    if (!ref.current) ref.current = new AudioContextClass()
    const ctx = ref.current
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.35)
  } catch {
    // ignore
  }
}

export function RestaurantVirtualKitchenScreen({ session, onSelectOrder, onNavigate }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyOrderId, setBusyOrderId] = useState('')
  const [busyItemId, setBusyItemId] = useState('')
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [dialogLoading, setDialogLoading] = useState(false)
  const [pendingAlerts, setPendingAlerts] = useState([])
  const [realtimeState, setRealtimeState] = useState('offline')
  const [readyAnnouncementOrderId, setReadyAnnouncementOrderId] = useState('')
  const readyAnnouncementOrderIdRef = useRef('')
  const beepRef = useRef(null)
  useAutoToast({ message: infoText, kind: 'success' })
  useAutoToast({ message: errorText, kind: 'error' })

  useEffect(() => {
    readyAnnouncementOrderIdRef.current = readyAnnouncementOrderId
  }, [readyAnnouncementOrderId])

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchRestaurantActiveOrders(session)
      setOrders(data)
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

  // Polling de fallback apenas enquanto o socket nao esta live. Bind ao boolean
  // para evitar reset do interval em cada flutuacao (connecting -> error -> live).
  const isRealtimeLive = realtimeState === 'live'
  useEffect(() => {
    if (isRealtimeLive) return undefined
    const timer = setInterval(loadOrders, 30000)
    return () => clearInterval(timer)
  }, [isRealtimeLive, loadOrders])

  useEffect(() => {
    if (!session?.restaurantId) return undefined
    let unsubscribe = null
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRealtimeState('connecting')
    try {
      unsubscribe = subscribeToRestaurantOrdersTopic({
        restaurantId: session.restaurantId,
        authToken: session.token,
        devUserId: session.devUserId,
        onSubscribed: () => setRealtimeState('live'),
        onEvent: (eventName, payload) => {
          setRealtimeState('live')
          const orderId = payload?.data?.order_id ?? payload?.orderId ?? null
          if (eventName === 'ORDER_CREATED') {
            playKitchenBeep(beepRef)
            setPendingAlerts((current) => {
              if (!orderId || current.includes(orderId)) return current
              return [...current, orderId]
            })
          }
          if (
            (eventName === 'ORDER_COURIER_ASSIGNED' || eventName === 'ORDER_OUT_FOR_DELIVERY') &&
            orderId &&
            readyAnnouncementOrderIdRef.current === orderId
          ) {
            setReadyAnnouncementOrderId('')
            setInfoText('Estafeta atribuido e a caminho.')
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

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.order_status === 'PENDING'),
    [orders],
  )

  const prepOrders = useMemo(
    () => orders.filter((order) => ['CONFIRMED', 'PREPARING', 'READY'].includes(order.order_status)),
    [orders],
  )

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

  async function handleItemStatus(orderItemId, status) {
    try {
      setBusyItemId(orderItemId)
      await updateOrderItemStatus({ session, orderItemId, status })
      setInfoText(`Item atualizado para ${mapStatusLabel(status)}.`)
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyItemId('')
    }
  }

  async function handleStartPreparing(orderId) {
    try {
      setBusyOrderId(orderId)
      await startPreparingRestaurantOrder({ session, orderId })
      setInfoText('Encomenda passada para preparacao.')
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
    }
  }

  async function handleMarkOrderReady(order) {
    try {
      setBusyOrderId(order.order_id)
      await markRestaurantOrderReady({ session, orderId: order.order_id })
      setReadyAnnouncementOrderId(order.order_id)
      setInfoText('Encomenda marcada como pronta. A procurar estafeta...')
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
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

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Cozinha Virtual</h2>
          <p>Gerir encomendas e preparacao de pratos</p>
        </div>
        <div className="rb-toast">
          <strong>
            {realtimeState === 'live'
              ? 'Realtime ativo'
              : realtimeState === 'connecting'
                ? 'A ligar realtime...'
                : realtimeState === 'error'
                  ? 'Realtime offline (fallback 30s)'
                  : 'Offline (fallback 30s)'}
          </strong>
          <span>Dados reais do backend com estados por item.</span>
        </div>
      </header>

      {pendingAlerts.length > 0 ? (
        <div className="rb-pending-alert">
          <strong>Nova encomenda recebida!</strong>
          <span>{pendingAlerts.length} pedido(s) por aceitar</span>
          <button
            type="button"
            className="rb-btn-outline"
            onClick={() => setPendingAlerts([])}
          >
            OK, vi
          </button>
        </div>
      ) : null}

      {readyAnnouncementOrderId ? (
        <div className="rb-pending-alert" style={{ borderColor: '#3479ed', background: '#eaf2ff' }}>
          <strong>A procurar estafeta para #{String(readyAnnouncementOrderId).slice(0, 8)}</strong>
          <span>Notificacao enviada por WebSocket. Aguarde atribuicao.</span>
          <button
            type="button"
            className="rb-btn-outline"
            onClick={() => setReadyAnnouncementOrderId('')}
          >
            Dispensar
          </button>
        </div>
      ) : null}

      <h3 className="rb-section-title">
        Encomendas pendentes <span>{pendingOrders.length}</span>
      </h3>

      <div className="rb-kitchen-grid">
        {loading && pendingOrders.length === 0 ? <p>A carregar...</p> : null}
        {!loading && pendingOrders.length === 0 ? <p>Sem encomendas pendentes.</p> : null}

        {pendingOrders.map((order) => (
          <article className="rb-kitchen-card" key={order.order_id}>
            <header className="rb-kitchen-header">
              <div>
                <h4>#{String(order.order_id).slice(0, 8)}</h4>
                <p>{formatTime(order.created_at)}</p>
              </div>
              <div className="rb-kitchen-price">
                <strong>{Number(order.total).toFixed(2)} EUR</strong>
                <span className="rb-chip pending">Pendente</span>
              </div>
            </header>

            <div className="rb-kitchen-contact">
              <p>{order.customer_name ?? `Cliente ${String(order.customer_id).slice(0, 8)}`}</p>
              <p>{order.delivery_address ?? 'Morada indisponivel'}</p>
            </div>

            <div className="rb-kitchen-items">
              {order.items.map((item) => (
                <div key={item.order_item_id}>
                  {item.quantity}x {item.name}
                </div>
              ))}
            </div>

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
                disabled={busyOrderId === order.order_id}
                onClick={() => handleOpenChat(order.order_id)}
              >
                Chat
              </button>
              <button
                type="button"
                className="rb-btn-outline"
                onClick={() => handleOpenDetail(order.order_id)}
              >
                Detalhe
              </button>
            </div>
          </article>
        ))}
      </div>

      <h3 className="rb-section-title">
        Em preparacao <span className="blue">{prepOrders.length}</span>
      </h3>

      {prepOrders.length === 0 ? <p>Sem encomendas em preparacao.</p> : null}

      {prepOrders.map((order) => (
        <article className="rb-prep-detail" key={order.order_id}>
          <header className="rb-prep-header">
            <div>
              <h4>#{String(order.order_id).slice(0, 8)}</h4>
              <p>{formatTime(order.created_at)}</p>
            </div>
            <div className="rb-kitchen-price">
              <strong>{Number(order.total).toFixed(2)} EUR</strong>
              <span className={`rb-chip ${mapOrderTone(order.order_status)}`}>
                {mapStatusLabel(order.order_status)}
              </span>
            </div>
          </header>

          <div className="rb-kitchen-contact">
            <p>{order.customer_name ?? `Cliente ${String(order.customer_id).slice(0, 8)}`}</p>
            <p>{order.delivery_address ?? 'Morada indisponivel'}</p>
          </div>

          <div className="rb-prep-lines">
            {order.items.map((item) => {
              const canSetPreparing = item.status === 'PENDING'
              const canSetReady = item.status === 'PREPARING'
              const canSetCancelled = item.status === 'PENDING' || item.status === 'PREPARING'

              return (
                <div className="rb-prep-line" key={item.order_item_id}>
                  <strong>
                    {item.quantity}x {item.name}
                  </strong>
                  <div className="rb-step-pills">
                    <span className={`rb-chip ${mapItemTone(item.status)}`}>{mapStatusLabel(item.status)}</span>
                    <button
                      type="button"
                      className={`rb-step ${canSetPreparing ? 'active' : ''}`}
                      disabled={!canSetPreparing || busyItemId === item.order_item_id}
                      onClick={() => handleItemStatus(item.order_item_id, 'PREPARING')}
                    >
                      A preparar
                    </button>
                    <button
                      type="button"
                      className={`rb-step ${canSetReady ? 'done' : ''}`}
                      disabled={!canSetReady || busyItemId === item.order_item_id}
                      onClick={() => handleItemStatus(item.order_item_id, 'READY')}
                    >
                      Pronto
                    </button>
                    <button
                      type="button"
                      className="rb-step"
                      disabled={!canSetCancelled || busyItemId === item.order_item_id}
                      onClick={() => handleItemStatus(item.order_item_id, 'CANCELLED')}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rb-event-timeline">
            <strong>Timeline do pedido</strong>
            {(order.events ?? []).length === 0 ? (
              <p className="rb-event-empty">Sem eventos registados.</p>
            ) : (
              order.events.slice(-4).reverse().map((event) => (
                <div className="rb-event-item" key={`${event.event_type}-${event.timestamp}`}>
                  <span>{formatEventType(event.event_type)}</span>
                  <small>{formatTime(event.timestamp)}</small>
                </div>
              ))
            )}
          </div>

          <footer className="rb-prep-actions">
            {order.order_status === 'CONFIRMED' ? (
              <button
                type="button"
                className="rb-btn-accept"
                onClick={() => handleStartPreparing(order.order_id)}
                disabled={busyOrderId === order.order_id}
              >
                Iniciar preparo
              </button>
            ) : null}
            <button
              type="button"
              className="rb-btn-accept"
              onClick={() => handleMarkOrderReady(order)}
              disabled={busyOrderId === order.order_id || order.order_status !== 'PREPARING'}
            >
              Marcar encomenda pronta
            </button>
            <button
              type="button"
              className="rb-btn-outline"
              onClick={() => handleOpenChat(order.order_id)}
              disabled={busyOrderId === order.order_id}
            >
              Abrir chat
            </button>
            <button
              type="button"
              className="rb-btn-outline"
              onClick={() => handleOpenDetail(order.order_id)}
              disabled={busyOrderId === order.order_id}
            >
              Detalhe
            </button>
            {['CONFIRMED', 'PREPARING', 'READY'].includes(order.order_status) ? (
              <button
                type="button"
                className="rb-btn-outline"
                onClick={() => requestCancel(order)}
                disabled={busyOrderId === order.order_id}
              >
                Cancelar pedido
              </button>
            ) : null}
          </footer>
        </article>
      ))}

      {infoText ? <p className="rb-prep-note">{infoText}</p> : null}
      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}

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
            placeholder="Ex: rutura de stock"
            disabled={dialogLoading}
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancelar encomenda em preparacao"
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
            placeholder="Ex: avaria de equipamento"
            disabled={dialogLoading}
          />
        </label>
      </ConfirmDialog>
    </section>
  )
}
