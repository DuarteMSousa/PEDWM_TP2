import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchRestaurantOrdersHistory } from '../../../services/restaurantOpsService'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { MoneyText } from '../../../components/common/MoneyText'

const STATUS_FILTERS = [
  { value: null, label: 'Todas' },
  { value: ['DELIVERED'], label: 'Entregues' },
  { value: ['CANCELLED'], label: 'Canceladas' },
  { value: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'], label: 'Ativas' },
]

const PAGE_SIZE = 20

export function RestaurantOrdersHistoryScreen({ session, onSelectOrder, onNavigate }) {
  const [orders, setOrders] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [activeFilter, setActiveFilter] = useState(0)

  const filter = STATUS_FILTERS[activeFilter]

  const load = useCallback(
    async ({ append = false } = {}) => {
      try {
        setLoading(true)
        const targetPage = append ? page + 1 : 1
        const data = await fetchRestaurantOrdersHistory({
          session,
          statuses: filter.value,
          page: targetPage,
          perPage: PAGE_SIZE,
        })
        setOrders((current) => (append ? [...current, ...data] : data))
        setPage(targetPage)
        setHasMore(data.length === PAGE_SIZE)
        setErrorText('')
      } catch (error) {
        setErrorText(error.message)
      } finally {
        setLoading(false)
      }
    },
    [session, filter.value, page],
  )

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    queueMicrotask(() => load({ append: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, activeFilter])

  function handleOpenDetail(orderId) {
    if (onSelectOrder) onSelectOrder(orderId)
    if (onNavigate) onNavigate('order-detail')
  }

  const stats = useMemo(() => {
    const total = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
    const delivered = orders.filter((order) => order.order_status === 'DELIVERED').length
    const cancelled = orders.filter((order) => order.order_status === 'CANCELLED').length
    return { total, delivered, cancelled }
  }, [orders])

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Histórico de pedidos</h2>
          <p>Inclui pedidos entregues e cancelados</p>
        </div>
        <button type="button" className="rb-btn-outline" onClick={() => load({ append: false })}>
          {loading ? 'A carregar...' : 'Atualizar'}
        </button>
      </header>

      <div className="rb-stat-grid">
        <article className="rb-stat-card">
          <p className="rb-stat-label">Pedidos carregados</p>
          <p className="rb-stat-value">{orders.length}</p>
        </article>
        <article className="rb-stat-card">
          <p className="rb-stat-label">Volume</p>
          <p className="rb-stat-value">{stats.total.toFixed(2)} EUR</p>
        </article>
        <article className="rb-stat-card">
          <p className="rb-stat-label">Entregues</p>
          <p className="rb-stat-value">{stats.delivered}</p>
        </article>
        <article className="rb-stat-card">
          <p className="rb-stat-label">Cancelados</p>
          <p className="rb-stat-value">{stats.cancelled}</p>
        </article>
      </div>

      <article className="rb-search-wrap">
        <div className="rb-filter-row">
          {STATUS_FILTERS.map((option, index) => (
            <button
              key={option.label}
              type="button"
              className={`rb-filter ${activeFilter === index ? 'active' : ''}`}
              onClick={() => setActiveFilter(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </article>

      <article className="rb-table-card">
        <table className="rb-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Pagamento</th>
              <th>Data</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && !loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="rb-empty-state">
                    <strong>Sem pedidos no histórico.</strong>
                  </div>
                </td>
              </tr>
            ) : null}
            {orders.map((order) => (
              <tr key={order.order_id}>
                <td>{String(order.order_id).slice(0, 8)}</td>
                <td>{order.customer_name ?? '-'}</td>
                <td>
                  <MoneyText value={order.total} />
                </td>
                <td>
                  <StatusBadge kind="order" status={order.order_status} />
                </td>
                <td>{order.payment_method ?? '-'}</td>
                <td>{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</td>
                <td>
                  <button
                    type="button"
                    className="rb-btn-outline"
                    onClick={() => handleOpenDetail(order.order_id)}
                  >
                    Detalhe
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {hasMore && orders.length > 0 ? (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button
              type="button"
              className="rb-btn-outline"
              onClick={() => load({ append: true })}
              disabled={loading}
            >
              {loading ? 'A carregar...' : 'Carregar mais'}
            </button>
          </div>
        ) : null}
      </article>

      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
    </section>
  )
}
