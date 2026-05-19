import { useCallback, useEffect, useState } from 'react'
import {
  acceptRestaurantOrder,
  cancelRestaurantOrder,
  fetchRestaurantOrderDetail,
  markRestaurantOrderReady,
  rejectRestaurantOrder,
  startPreparingRestaurantOrder,
  updateOrderItemStatus,
} from '../../../services/restaurantOpsService'
import { ConfirmDialog } from '../../../components/common/ConfirmDialog'
import { DeliveryLeafletMap } from '../../../components/common/DeliveryLeafletMap'
import { subscribeToOrderTrackingTopic } from '../../../services/realtime/topicsRealtime'

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

function statusTone(status) {
  if (status === 'PENDING') return 'pending'
  if (status === 'CONFIRMED' || status === 'PREPARING') return 'prep'
  if (status === 'READY' || status === 'OUT_FOR_DELIVERY' || status === 'DELIVERED') return 'done'
  return 'off'
}

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function formatEventType(eventType) {
  return String(eventType ?? '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (match) => match.toUpperCase())
}

export function RestaurantOrderDetailScreen({ session, selectedOrderId, onSelectOrder, onNavigate }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [courierPosition, setCourierPosition] = useState(null)

  const loadDetail = useCallback(async () => {
    if (!selectedOrderId) {
      setOrder(null)
      return
    }
    try {
      setLoading(true)
      const data = await fetchRestaurantOrderDetail({ session, orderId: selectedOrderId })
      setOrder(data)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }, [session, selectedOrderId])

  useEffect(() => {
    queueMicrotask(() => loadDetail())
  }, [loadDetail])

  useEffect(() => {
    if (!selectedOrderId) return undefined
    let unsubscribe = null
    try {
      unsubscribe = subscribeToOrderTrackingTopic({
        orderId: selectedOrderId,
        authToken: session.token,
        devUserId: session.devUserId,
        onPositionUpdated: (payload) => {
          setCourierPosition({
            lat: Number(payload?.lat),
            lng: Number(payload?.lng),
            recorded_at: payload?.recordedAt ?? new Date().toISOString(),
          })
        },
        onError: () => {},
      })
    } catch {
      // ignore
    }
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [selectedOrderId, session?.token, session?.devUserId])

  useEffect(() => {
    setCourierPosition(null)
  }, [selectedOrderId])

  async function withBusy(action, message) {
    try {
      setBusy(true)
      await action()
      if (message) setInfoText(message)
      setErrorText('')
      await loadDetail()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusy(false)
    }
  }

  function handleOpenChat() {
    if (onSelectOrder) onSelectOrder(selectedOrderId)
    if (onNavigate) onNavigate('chat')
  }

  if (!selectedOrderId) {
    return (
      <section className="rb-page">
        <header className="rb-page-head">
          <h2>Detalhe do pedido</h2>
          <p>Selecciona um pedido no Dashboard ou Cozinha.</p>
        </header>
        <div className="rb-empty-state">
          <strong>Nenhum pedido selecionado.</strong>
          <p>Volta ao dashboard para escolher um pedido.</p>
          <button type="button" className="rb-btn-outline" onClick={() => onNavigate?.('dashboard')}>
            Ir para Dashboard
          </button>
        </div>
      </section>
    )
  }

  if (loading && !order) {
    return (
      <section className="rb-page">
        <header className="rb-page-head">
          <h2>Detalhe do pedido</h2>
          <p>A carregar...</p>
        </header>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="rb-page">
        <header className="rb-page-head">
          <h2>Pedido nao encontrado</h2>
        </header>
        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </section>
    )
  }

  const subtotalDiscounts = (order.discounts ?? []).reduce(
    (sum, discount) => sum + Number(discount.discount_amount ?? 0),
    0,
  )

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Pedido #{String(order.id).slice(0, 8)}</h2>
          <p>{order.user?.name ?? order.user_id} - {formatTime(order.created_at)}</p>
        </div>
        <span className={`rb-chip ${statusTone(order.status)}`}>{statusLabel(order.status)}</span>
      </header>

      <div className="rb-detail-grid">
        <article className="rb-table-card">
          <div className="rb-table-head">
            <h3>Items</h3>
            <strong>{Number(order.total).toFixed(2)} EUR</strong>
          </div>
          <div className="rb-prep-lines">
            {(order.items ?? []).map((item) => (
              <div className="rb-prep-line" key={item.id}>
                <div>
                  <strong>{item.quantity}x {item.product_name_snapshot}</strong>
                  {(item.options ?? []).length > 0 ? (
                    <div className="rb-detail-options">
                      {item.options.map((option) => (
                        <small key={option.id}>
                          + {option.option_name_snapshot}
                          {Number(option.extra_price) > 0
                            ? ` (${Number(option.extra_price).toFixed(2)} EUR)`
                            : ''}
                        </small>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="rb-step-pills">
                  <span className={`rb-chip ${statusTone(item.status)}`}>{statusLabel(item.status)}</span>
                  <strong>{Number(item.total_price ?? 0).toFixed(2)} EUR</strong>
                </div>
              </div>
            ))}
          </div>

          {subtotalDiscounts > 0 ? (
            <div className="rb-detail-row">
              <span>Descontos aplicados</span>
              <strong>-{subtotalDiscounts.toFixed(2)} EUR</strong>
            </div>
          ) : null}

          <div className="rb-detail-row total">
            <span>Total a receber</span>
            <strong>{Number(order.total).toFixed(2)} EUR</strong>
          </div>
        </article>

        <article className="rb-table-card">
          <div className="rb-table-head">
            <h3>Cliente & Entrega</h3>
          </div>
          <div className="rb-detail-row">
            <span>Cliente</span>
            <strong>{order.user?.name ?? '-'}</strong>
          </div>
          <div className="rb-detail-row">
            <span>Email</span>
            <strong>{order.user?.email ?? '-'}</strong>
          </div>
          <div className="rb-detail-row">
            <span>Morada</span>
            <strong>
              {order.address
                ? `${order.address.street}, ${order.address.city} (${order.address.postal_code})`
                : '-'}
            </strong>
          </div>
          <div className="rb-detail-row">
            <span>Pagamento</span>
            <strong>
              {order.payment ? `${order.payment.method} - ${order.payment.status}` : '-'}
            </strong>
          </div>
          {order.payment?.paid_at ? (
            <div className="rb-detail-row">
              <span>Pago em</span>
              <strong>{formatTime(order.payment.paid_at)}</strong>
            </div>
          ) : null}
          {order.delivery ? (
            <>
              <div className="rb-detail-row">
                <span>Estafeta</span>
                <strong>
                  {order.delivery.courier?.user?.name ?? order.delivery.courier_id ?? 'Nao atribuido'}
                </strong>
              </div>
              <div className="rb-detail-row">
                <span>Estado entrega</span>
                <strong>{order.delivery.status}</strong>
              </div>
              {order.delivery.pickup_time ? (
                <div className="rb-detail-row">
                  <span>Recolha</span>
                  <strong>{formatTime(order.delivery.pickup_time)}</strong>
                </div>
              ) : null}
              {order.delivery.delivery_time ? (
                <div className="rb-detail-row">
                  <span>Entregue</span>
                  <strong>{formatTime(order.delivery.delivery_time)}</strong>
                </div>
              ) : null}
              {courierPosition?.recorded_at ? (
                <div className="rb-detail-row">
                  <span>Posicao courier (live)</span>
                  <strong>{formatTime(courierPosition.recorded_at)}</strong>
                </div>
              ) : null}
            </>
          ) : null}
        </article>
      </div>

      {(() => {
        const pickup =
          order.restaurant?.address &&
          Number.isFinite(Number(order.restaurant.address.latitude)) &&
          Number.isFinite(Number(order.restaurant.address.longitude))
            ? {
                lat: Number(order.restaurant.address.latitude),
                lng: Number(order.restaurant.address.longitude),
                label: order.restaurant?.name ?? 'Pickup',
              }
            : null

        const dropoff =
          order.address &&
          Number.isFinite(Number(order.address.latitude)) &&
          Number.isFinite(Number(order.address.longitude))
            ? {
                lat: Number(order.address.latitude),
                lng: Number(order.address.longitude),
                label: order.user?.name ?? 'Cliente',
              }
            : null

        const liveCourier = courierPosition
          ? { lat: courierPosition.lat, lng: courierPosition.lng }
          : order.delivery?.courier &&
              Number.isFinite(Number(order.delivery.courier.latitude)) &&
              Number.isFinite(Number(order.delivery.courier.longitude))
            ? {
                lat: Number(order.delivery.courier.latitude),
                lng: Number(order.delivery.courier.longitude),
              }
            : null

        if (!pickup && !dropoff && !liveCourier) return null

        return (
          <article className="rb-table-card">
            <div className="rb-table-head">
              <h3>Mapa da entrega</h3>
              <small>
                {liveCourier
                  ? courierPosition
                    ? 'Posicao em tempo real (WebSocket)'
                    : 'Ultima posicao conhecida'
                  : 'Pickup e dropoff'}
              </small>
            </div>
            <DeliveryLeafletMap pickup={pickup} dropoff={dropoff} courier={liveCourier} />
          </article>
        )
      })()}

      <article className="rb-table-card">
        <div className="rb-table-head">
          <h3>Timeline de eventos</h3>
          <button type="button" className="rb-btn-outline" onClick={loadDetail} disabled={loading}>
            {loading ? 'A atualizar...' : 'Atualizar'}
          </button>
        </div>
        {(order.events ?? []).length === 0 ? (
          <p className="rb-event-empty">Sem eventos registados.</p>
        ) : (
          <div className="rb-event-timeline">
            {[...(order.events ?? [])].reverse().map((event) => (
              <div className="rb-event-item" key={`${event.event_type}-${event.timestamp}`}>
                <span>{formatEventType(event.event_type)}</span>
                <small>{formatTime(event.timestamp)}</small>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="rb-detail-actions">
        {order.status === 'PENDING' ? (
          <>
            <button
              type="button"
              className="rb-btn-outline"
              disabled={busy}
              onClick={() => setRejectOpen(true)}
            >
              Rejeitar
            </button>
            <button
              type="button"
              className="rb-btn-accept"
              disabled={busy}
              onClick={() =>
                withBusy(
                  () =>
                    acceptRestaurantOrder({
                      session,
                      orderId: order.id,
                    }),
                  'Encomenda aceite.',
                )
              }
            >
              Aceitar
            </button>
          </>
        ) : null}
        {order.status === 'CONFIRMED' ? (
          <button
            type="button"
            className="rb-btn-accept"
            disabled={busy}
            onClick={() =>
              withBusy(
                () => startPreparingRestaurantOrder({ session, orderId: order.id }),
                'Encomenda em preparacao.',
              )
            }
          >
            Iniciar preparo
          </button>
        ) : null}
        {order.status === 'PREPARING' ? (
          <button
            type="button"
            className="rb-btn-accept"
            disabled={busy}
            onClick={() =>
              withBusy(
                () => markRestaurantOrderReady({ session, orderId: order.id }),
                'Encomenda pronta para recolha.',
              )
            }
          >
            Marcar pronto
          </button>
        ) : null}
        {['CONFIRMED', 'PREPARING'].includes(order.status) ? (
          <button
            type="button"
            className="rb-btn-outline"
            disabled={busy}
            onClick={() => setCancelOpen(true)}
          >
            Cancelar pedido
          </button>
        ) : null}
        <button type="button" className="rb-btn-outline" onClick={handleOpenChat}>
          Abrir chat
        </button>
        <button type="button" className="rb-btn-outline" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      {infoText ? <p className="rb-success-note">{infoText}</p> : null}
      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}

      <ConfirmDialog
        open={rejectOpen}
        title="Rejeitar encomenda"
        confirmLabel="Rejeitar"
        destructive
        loading={busy}
        onCancel={() => {
          if (!busy) {
            setRejectOpen(false)
            setRejectReason('')
          }
        }}
        onConfirm={() =>
          withBusy(
            () =>
              rejectRestaurantOrder({
                session,
                orderId: order.id,
                reason: rejectReason,
              }),
            'Encomenda rejeitada.',
          ).then(() => {
            setRejectOpen(false)
            setRejectReason('')
          })
        }
      >
        <label>
          Motivo (opcional)
          <textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Ex: rutura de stock"
            disabled={busy}
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancelar encomenda"
        confirmLabel="Cancelar encomenda"
        destructive
        loading={busy}
        onCancel={() => {
          if (!busy) {
            setCancelOpen(false)
            setCancelReason('')
          }
        }}
        onConfirm={() =>
          withBusy(
            () =>
              cancelRestaurantOrder({
                session,
                orderId: order.id,
                reason: cancelReason,
              }),
            'Encomenda cancelada.',
          ).then(() => {
            setCancelOpen(false)
            setCancelReason('')
          })
        }
      >
        <label>
          Motivo (opcional)
          <textarea
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Ex: avaria de equipamento"
            disabled={busy}
          />
        </label>
      </ConfirmDialog>
    </section>
  )
}
