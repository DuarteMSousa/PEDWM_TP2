import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pickupIcon = new L.DivIcon({
  className: 'rb-map-pin',
  html:
    '<div style="position:relative;width:34px;height:42px">' +
    '<div style="position:absolute;inset:0;background:#16a34a;clip-path:path(\'M17 0 C7 0 0 8 0 17 C0 30 17 42 17 42 C17 42 34 30 34 17 C34 8 27 0 17 0 Z\');box-shadow:0 4px 10px rgba(0,0,0,0.25)"></div>' +
    '<div style="position:absolute;top:8px;left:8px;width:18px;height:18px;border-radius:50%;background:#ffffff;display:flex;align-items:center;justify-content:center;font-size:12px;color:#16a34a;font-weight:800">R</div>' +
    '</div>',
  iconSize: [34, 42],
  iconAnchor: [17, 42],
  popupAnchor: [0, -38],
})

const dropoffIcon = new L.DivIcon({
  className: 'rb-map-pin',
  html:
    '<div style="position:relative;width:34px;height:42px">' +
    '<div style="position:absolute;inset:0;background:#ea580c;clip-path:path(\'M17 0 C7 0 0 8 0 17 C0 30 17 42 17 42 C17 42 34 30 34 17 C34 8 27 0 17 0 Z\');box-shadow:0 4px 10px rgba(0,0,0,0.25)"></div>' +
    '<div style="position:absolute;top:8px;left:8px;width:18px;height:18px;border-radius:50%;background:#ffffff;display:flex;align-items:center;justify-content:center;font-size:12px;color:#ea580c;font-weight:800">C</div>' +
    '</div>',
  iconSize: [34, 42],
  iconAnchor: [17, 42],
  popupAnchor: [0, -38],
})

const courierIcon = new L.DivIcon({
  className: 'rb-courier-marker',
  html:
    '<div style="background:#2563eb;color:#fff;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:800;box-shadow:0 3px 8px rgba(37,99,235,0.4);border:2px solid #fff">Estafeta</div>',
  iconSize: [70, 26],
  iconAnchor: [35, 13],
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
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
  }, [points, map])
  return null
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return null
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return null
  if (seconds < 60) return `${Math.round(seconds)} s`
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}min`
}

export function DeliveryLeafletMap({
  pickup = null,
  dropoff = null,
  courier = null,
  height = 320,
}) {
  const [route, setRoute] = useState(null)
  const [routeMeta, setRouteMeta] = useState(null)
  const [routeError, setRouteError] = useState(false)

  const points = useMemo(
    () => [pickup, dropoff, courier].filter(Boolean),
    [pickup, dropoff, courier],
  )

  const initialCenter = points.length > 0
    ? [points[0].lat, points[0].lng]
    : [41.1579, -8.6291]

  // Fetch route real via OSRM (rede viaria), fallback para linha reta
  useEffect(() => {
    if (!pickup || !dropoff) {
      setRoute(null)
      setRouteMeta(null)
      setRouteError(false)
      return undefined
    }

    const controller = new AbortController()
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}` +
      `?overview=full&geometries=geojson`

    setRouteError(false)
    fetch(url, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((payload) => {
        const r = payload?.routes?.[0]
        if (!r?.geometry?.coordinates) {
          setRouteError(true)
          return
        }
        const latLngs = r.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        setRoute(latLngs)
        setRouteMeta({ distance: r.distance, duration: r.duration })
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        setRouteError(true)
        setRoute(null)
        setRouteMeta(null)
      })

    return () => controller.abort()
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng])

  // Linha do estafeta -> dropoff (mantemos reta porque a posicao do estafeta muda em tempo real)
  const courierLine = useMemo(() => {
    if (!courier || !dropoff) return null
    return [
      [courier.lat, courier.lng],
      [dropoff.lat, dropoff.lng],
    ]
  }, [courier, dropoff])

  // Fallback: linha reta pickup -> dropoff se OSRM falhar
  const fallbackLine = useMemo(() => {
    if (route || !pickup || !dropoff) return null
    return [
      [pickup.lat, pickup.lng],
      [dropoff.lat, dropoff.lng],
    ]
  }, [route, pickup, dropoff])

  const distanceLabel = routeMeta ? formatDistance(routeMeta.distance) : null
  const durationLabel = routeMeta ? formatDuration(routeMeta.duration) : null

  return (
    <div
      style={{
        position: 'relative',
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        {pickup ? (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>
              <strong>Restaurante</strong>
              {pickup.label ? <div>{pickup.label}</div> : null}
            </Popup>
          </Marker>
        ) : null}
        {dropoff ? (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>
              <strong>Cliente</strong>
              {dropoff.label ? <div>{dropoff.label}</div> : null}
            </Popup>
          </Marker>
        ) : null}
        {courier ? (
          <Marker position={[courier.lat, courier.lng]} icon={courierIcon}>
            <Popup>Posicao do estafeta</Popup>
          </Marker>
        ) : null}
        {route ? (
          <>
            {/* sombra mais larga por baixo para dar profundidade */}
            <Polyline
              positions={route}
              pathOptions={{ color: '#0c4a6e', weight: 7, opacity: 0.25 }}
            />
            <Polyline
              positions={route}
              pathOptions={{ color: '#f97316', weight: 4, opacity: 0.95 }}
            />
          </>
        ) : null}
        {fallbackLine ? (
          <Polyline
            positions={fallbackLine}
            pathOptions={{ color: '#f97316', weight: 3, dashArray: '8 10', opacity: 0.7 }}
          />
        ) : null}
        {courierLine ? (
          <Polyline
            positions={courierLine}
            pathOptions={{ color: '#2563eb', weight: 3, dashArray: '4 8', opacity: 0.85 }}
          />
        ) : null}
        <FitToBounds points={points} />
      </MapContainer>

      {(distanceLabel || durationLabel || routeError) ? (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 10,
            padding: '8px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: 12,
            fontWeight: 600,
            color: '#0f172a',
            zIndex: 500,
            pointerEvents: 'none',
          }}
        >
          {routeError ? (
            <span style={{ color: '#b91c1c' }}>Rota indisponivel (linha reta)</span>
          ) : (
            <>
              {distanceLabel ? <div>{distanceLabel}</div> : null}
              {durationLabel ? <div style={{ color: '#475569' }}>~{durationLabel} de carro</div> : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
