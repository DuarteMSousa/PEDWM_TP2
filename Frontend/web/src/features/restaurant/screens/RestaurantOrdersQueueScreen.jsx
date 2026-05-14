import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  acceptRestaurantOrder,
  fetchRestaurantActiveOrders,
  rejectRestaurantOrder,
} from '../../../services/restaurantOpsService'

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

export function RestaurantOrdersQueueScreen({ session }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')

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
    const timer = setInterval(loadOrders, 15000)
    return () => clearInterval(timer)
  }, [loadOrders])

  async function handleAccept(orderId) {
    try {
      setBusyOrderId(orderId)
      await acceptRestaurantOrder({ session, orderId })
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
    }
  }

  async function handleReject(orderId) {
    try {
      setBusyOrderId(orderId)
      await rejectRestaurantOrder({ session, orderId })
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
    }
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
      <header className="rb-page-head">
        <h2>Dashboard</h2>
        <p>Encomendas ativas em tempo real</p>
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
              <tr>
                <td colSpan={6}>A carregar...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6}>Sem encomendas ativas.</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.order_id}>
                  <td>{String(order.order_id).slice(0, 8)}</td>
                  <td>{String(order.customer_id).slice(0, 8)}</td>
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
                          onClick={() => handleReject(order.order_id)}
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
                      </div>
                    ) : (
                      <small>-</small>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </article>
    </section>
  )
}
