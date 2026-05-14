import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  acceptRestaurantOrder,
  fetchRestaurantActiveOrders,
  rejectRestaurantOrder,
  updateOrderItemStatus,
} from '../../../services/restaurantOpsService'

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

export function RestaurantVirtualKitchenScreen({ session }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyOrderId, setBusyOrderId] = useState('')
  const [busyItemId, setBusyItemId] = useState('')
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')

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

    const timer = setInterval(loadOrders, 15000)
    return () => clearInterval(timer)
  }, [loadOrders])

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

  async function handleReject(orderId) {
    try {
      setBusyOrderId(orderId)
      await rejectRestaurantOrder({ session, orderId })
      setInfoText('Encomenda rejeitada.')
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
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

  async function handleMarkOrderReady(order) {
    const preparingItems = order.items.filter((item) => item.status === 'PREPARING')

    if (preparingItems.length === 0) {
      setInfoText('Sem itens em preparacao para marcar como prontos.')
      return
    }

    try {
      setBusyOrderId(order.order_id)

      for (const item of preparingItems) {
        await updateOrderItemStatus({
          session,
          orderItemId: item.order_item_id,
          status: 'READY',
        })
      }

      setInfoText('Itens em preparacao marcados como prontos.')
      await loadOrders()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
    }
  }

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Cozinha Virtual</h2>
          <p>Gerir encomendas e preparacao de pratos</p>
        </div>
        <div className="rb-toast">
          <strong>Atualizacao automatica a cada 15s</strong>
          <span>Dados reais do backend com estados por item.</span>
        </div>
      </header>

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

          <footer className="rb-prep-actions">
            <button
              type="button"
              className="rb-btn-outline"
              onClick={loadOrders}
              disabled={busyOrderId === order.order_id}
            >
              Atualizar
            </button>
            <button
              type="button"
              className="rb-btn-accept"
              onClick={() => handleMarkOrderReady(order)}
              disabled={busyOrderId === order.order_id}
            >
              Marcar em preparo como pronto
            </button>
          </footer>
        </article>
      ))}

      {infoText ? <p className="rb-prep-note">{infoText}</p> : null}
      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
    </section>
  )
}
