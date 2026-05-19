import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  acceptRestaurantOrder,
  cancelRestaurantOrder,
  fetchRestaurantActiveOrders,
  rejectRestaurantOrder,
} from '../../../services/restaurantOpsService'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { useAutoToast } from '../../../components/common/ToastProvider'
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
  useAutoToast({ message: infoText, kind: 'success' })
  useAutoToast({ message: errorText, kind: 'error' })

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

  // Polling de fallback apenas enquanto o socket nao esta live. Bind ao boolean
  // para evitar reset do interval em cada flutuacao (connecting -> error -> live).
  const isRealtimeLive = realtimeState === 'live'
  useEffect(() => {
    if (isRealtimeLive) return undefined
    const timer = setInterval(loadOrders, 30000)
    return () => clearInterval(timer)
  }, [isRealtimeLive, loadOrders])

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
        onSubscribed: () => setRealtimeState('live'),
        onEvent: (eventName) => {
          setRealtimeState('live')
          if (eventName === 'ORDER_CREATED') {
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
                        {['CONFIRMED', 'PREPARING', 'READY'].includes(order.order_status) ? (
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
