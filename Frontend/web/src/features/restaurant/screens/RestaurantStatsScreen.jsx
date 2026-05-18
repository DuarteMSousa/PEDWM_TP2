import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchRestaurantOrdersHistory } from '../../../services/restaurantOpsService'

const ACTIVE_STATUSES = ['DELIVERED']

export function RestaurantStatsScreen({ session }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [days, setDays] = useState(7)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchRestaurantOrdersHistory({
        session,
        statuses: ACTIVE_STATUSES,
        page: 1,
        perPage: 200,
      })
      setOrders(data)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    queueMicrotask(() => load())
  }, [load])

  const stats = useMemo(() => {
    const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000
    const inRange = orders.filter((order) => {
      const ts = Date.parse(order.created_at)
      return !Number.isNaN(ts) && ts >= cutoffMs
    })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayOrders = inRange.filter((order) => {
      return Date.parse(order.created_at) >= todayStart.getTime()
    })

    const revenueRange = inRange.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
    const revenueToday = todayOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0)
    const averageOrderValue = inRange.length > 0 ? revenueRange / inRange.length : 0

    // Pedidos por hora (todas as horas no range)
    const ordersByHour = Array.from({ length: 24 }, () => 0)
    inRange.forEach((order) => {
      const date = new Date(order.created_at)
      if (!Number.isNaN(date.getTime())) {
        ordersByHour[date.getHours()] += 1
      }
    })

    const peakHour = ordersByHour.reduce(
      (acc, count, hour) => (count > acc.count ? { count, hour } : acc),
      { count: 0, hour: 0 },
    )

    return {
      totalInRange: inRange.length,
      todayCount: todayOrders.length,
      revenueRange,
      revenueToday,
      averageOrderValue,
      ordersByHour,
      peakHour,
    }
  }, [orders, days])

  const maxHourCount = Math.max(1, ...stats.ordersByHour)

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Dashboard de estatisticas</h2>
          <p>Vista global de pedidos concluidos</p>
        </div>
        <div className="rb-filter-row">
          {[1, 7, 30].map((option) => (
            <button
              key={option}
              type="button"
              className={`rb-filter ${days === option ? 'active' : ''}`}
              onClick={() => setDays(option)}
            >
              {option === 1 ? 'Hoje' : `${option} dias`}
            </button>
          ))}
          <button type="button" className="rb-btn-outline" onClick={load} disabled={loading}>
            {loading ? 'A carregar...' : 'Atualizar'}
          </button>
        </div>
      </header>

      <div className="rb-stat-grid">
        <article className="rb-stat-card">
          <p className="rb-stat-label">Receita ({days === 1 ? 'hoje' : `${days}d`})</p>
          <p className="rb-stat-value">{stats.revenueRange.toFixed(2)} EUR</p>
        </article>
        <article className="rb-stat-card">
          <p className="rb-stat-label">Receita hoje</p>
          <p className="rb-stat-value">{stats.revenueToday.toFixed(2)} EUR</p>
        </article>
        <article className="rb-stat-card">
          <p className="rb-stat-label">Pedidos no periodo</p>
          <p className="rb-stat-value">{stats.totalInRange}</p>
        </article>
        <article className="rb-stat-card">
          <p className="rb-stat-label">Ticket medio</p>
          <p className="rb-stat-value">{stats.averageOrderValue.toFixed(2)} EUR</p>
        </article>
      </div>

      <article className="rb-table-card">
        <div className="rb-table-head">
          <h3>Pedidos por hora</h3>
          <small>Hora de pico: {stats.peakHour.hour}h ({stats.peakHour.count} pedidos)</small>
        </div>
        <div className="rb-hourly-bars">
          {stats.ordersByHour.map((count, hour) => (
            <div key={`hour-${hour}`} className="rb-hourly-bar-col">
              <div
                className="rb-hourly-bar"
                style={{ height: `${(count / maxHourCount) * 100}%` }}
                title={`${count} pedidos`}
              />
              <span className="rb-hourly-bar-label">{hour}</span>
            </div>
          ))}
        </div>
      </article>

      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
    </section>
  )
}
