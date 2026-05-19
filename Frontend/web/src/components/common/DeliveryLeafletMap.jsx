import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Workaround para os icones do leaflet nao aparecerem em build do Vite.
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const courierIcon = new L.DivIcon({
  className: 'rb-courier-marker',
  html: '<div style="background:#2563eb;color:#fff;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.3)">Estafeta</div>',
  iconSize: [60, 22],
  iconAnchor: [30, 11],
})

function FitToBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    const valid = points.filter(
      (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng),
    )
    if (valid.length === 0) return
    const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
  }, [points, map])
  return null
}

export function DeliveryLeafletMap({
  pickup = null,
  dropoff = null,
  courier = null,
  height = 320,
}) {
  const points = useMemo(
    () => [pickup, dropoff, courier].filter(Boolean),
    [pickup, dropoff, courier],
  )

  const initialCenter = points.length > 0
    ? [points[0].lat, points[0].lng]
    : [41.1579, -8.6291]

  const routeLine = useMemo(() => {
    if (!pickup || !dropoff) return null
    return [
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng],
    ]
  }, [pickup, dropoff])

  const courierLine = useMemo(() => {
    if (!courier || !dropoff) return null
    return [
      [courier.lat, courier.lng],
      [dropoff.lat, dropoff.lng],
    ]
  }, [courier, dropoff])

  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid #dfe4ec',
      }}
    >
      <MapContainer
        center={initialCenter}
        zoom={13}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickup ? (
          <Marker position={[pickup.lat, pickup.lng]} icon={defaultIcon}>
            <Popup>Pickup{pickup.label ? ` — ${pickup.label}` : ''}</Popup>
          </Marker>
        ) : null}
        {dropoff ? (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={defaultIcon}>
            <Popup>Dropoff{dropoff.label ? ` — ${dropoff.label}` : ''}</Popup>
          </Marker>
        ) : null}
        {courier ? (
          <Marker position={[courier.lat, courier.lng]} icon={courierIcon}>
            <Popup>Posicao do estafeta</Popup>
          </Marker>
        ) : null}
        {routeLine ? (
          <Polyline positions={routeLine} pathOptions={{ color: '#f97316', weight: 3 }} />
        ) : null}
        {courierLine ? (
          <Polyline
            positions={courierLine}
            pathOptions={{ color: '#2563eb', weight: 3, dashArray: '6 8' }}
          />
        ) : null}
        <FitToBounds points={points} />
      </MapContainer>
    </div>
  )
}
