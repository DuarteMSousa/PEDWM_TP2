function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizePoints(points) {
  const valid = points.filter((point) => point && point.lat !== null && point.lng !== null)

  if (valid.length === 0) {
    return []
  }

  const lats = valid.map((point) => Number(point.lat))
  const lngs = valid.map((point) => Number(point.lng))

  let minLat = Math.min(...lats)
  let maxLat = Math.max(...lats)
  let minLng = Math.min(...lngs)
  let maxLng = Math.max(...lngs)

  if (minLat === maxLat) {
    minLat -= 0.001
    maxLat += 0.001
  }

  if (minLng === maxLng) {
    minLng -= 0.001
    maxLng += 0.001
  }

  const pad = 0.12

  return valid.map((point) => {
    const xRaw = (Number(point.lng) - minLng) / (maxLng - minLng)
    const yRaw = (Number(point.lat) - minLat) / (maxLat - minLat)

    return {
      ...point,
      x: clamp(pad + xRaw * (1 - pad * 2), 0.05, 0.95),
      y: clamp(1 - (pad + yRaw * (1 - pad * 2)), 0.05, 0.95),
    }
  })
}

export function DeliveryMapPanel({ pickup, dropoff, courier }) {
  const points = normalizePoints([
    pickup ? { ...pickup, key: 'pickup', label: pickup.label ?? 'Pickup', tone: 'pickup' } : null,
    dropoff ? { ...dropoff, key: 'dropoff', label: dropoff.label ?? 'Dropoff', tone: 'dropoff' } : null,
    courier ? { ...courier, key: 'courier', label: courier.label ?? 'Estafeta', tone: 'courier' } : null,
  ])

  return (
    <article className="rb-map-panel">
      <header className="rb-map-header">
        <h3>Mapa de tracking</h3>
        <p>Posicao ao vivo no canal order.{`{orderId}`}.tracking</p>
      </header>
      <div className="rb-map-canvas">
        <div className="rb-map-grid-h rb-map-grid-h-1" />
        <div className="rb-map-grid-h rb-map-grid-h-2" />
        <div className="rb-map-grid-v rb-map-grid-v-1" />
        <div className="rb-map-grid-v rb-map-grid-v-2" />

        {points.map((point) => (
          <div
            key={point.key}
            className={`rb-map-pin ${point.tone}`}
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          >
            {point.label}
          </div>
        ))}
      </div>
      <footer className="rb-map-legend">
        <span>Pickup</span>
        <span>Dropoff</span>
        <span>Estafeta</span>
      </footer>
    </article>
  )
}
