import { useMemo } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import marker from 'leaflet/dist/images/marker-icon.png'
import shadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

function toLatLng(point) {
  if (!point || point.lat === null || point.lng === null || point.lat === undefined || point.lng === undefined) {
    return null
  }

  return [Number(point.lat), Number(point.lng)]
}

export function LeafletTrackingMap({ pickup, dropoff, courier, positions = [], routePoints = [] }) {
  const pickupLatLng = toLatLng(pickup)
  const dropoffLatLng = toLatLng(dropoff)
  const courierLatLng = toLatLng(courier)

  const path = useMemo(
    () =>
      positions
        .filter((point) => point && point.lat !== null && point.lng !== null)
        .map((point) => [Number(point.lat), Number(point.lng)]),
    [positions],
  )

  const routePath = useMemo(
    () =>
      routePoints
        .filter((point) => point && point.lat !== null && point.lng !== null)
        .map((point) => [Number(point.lat), Number(point.lng)]),
    [routePoints],
  )

  const center = courierLatLng ?? pickupLatLng ?? dropoffLatLng ?? [41.1579, -8.6291]

  return (
    <article className="rb-map-panel">
      <header className="rb-map-header">
        <h3>Mapa de tracking</h3>
        <p>Posicao ao vivo no canal order.{`{orderId}`}.tracking</p>
      </header>

      <div className="rb-map-canvas rb-map-leaflet-wrap">
        <MapContainer center={center} zoom={13} scrollWheelZoom className="rb-map-leaflet">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {pickupLatLng ? (
            <Marker position={pickupLatLng} icon={defaultIcon}>
              <Tooltip direction="top" offset={[0, -20]} permanent>
                Pickup
              </Tooltip>
            </Marker>
          ) : null}

          {dropoffLatLng ? (
            <Marker position={dropoffLatLng} icon={defaultIcon}>
              <Tooltip direction="top" offset={[0, -20]} permanent>
                Dropoff
              </Tooltip>
            </Marker>
          ) : null}

          {courierLatLng ? (
            <Marker position={courierLatLng} icon={defaultIcon}>
              <Tooltip direction="top" offset={[0, -20]} permanent>
                Estafeta
              </Tooltip>
            </Marker>
          ) : null}

          {routePath.length >= 2 ? (
            <Polyline positions={routePath} pathOptions={{ color: '#f97316', weight: 4 }} />
          ) : pickupLatLng && dropoffLatLng ? (
            <Polyline positions={[pickupLatLng, dropoffLatLng]} pathOptions={{ color: '#f97316', weight: 4 }} />
          ) : null}

          {path.length >= 2 ? (
            <Polyline positions={path} pathOptions={{ color: '#2563eb', weight: 4 }} />
          ) : null}
        </MapContainer>
      </div>

      <footer className="rb-map-legend">
        <span>Pickup</span>
        <span>Dropoff</span>
        <span>Estafeta</span>
      </footer>
    </article>
  )
}
