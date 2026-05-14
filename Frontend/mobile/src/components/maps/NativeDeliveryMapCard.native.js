import { StyleSheet, View } from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'

function resolveRegion(points) {
  const valid = points.filter((point) => point && point.latitude !== null && point.longitude !== null)

  if (valid.length === 0) {
    return {
      latitude: 41.1579,
      longitude: -8.6291,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    }
  }

  const lats = valid.map((point) => Number(point.latitude))
  const lngs = valid.map((point) => Number(point.longitude))

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latitude = (minLat + maxLat) / 2
  const longitude = (minLng + maxLng) / 2
  const latitudeDelta = Math.max(0.01, (maxLat - minLat) * 1.8)
  const longitudeDelta = Math.max(0.01, (maxLng - minLng) * 1.8)

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  }
}

export function NativeDeliveryMapCard({ pickup, dropoff, courier, routePoints = [], positions = [] }) {
  const pickupCoord =
    pickup && pickup.lat !== null && pickup.lng !== null
      ? { latitude: Number(pickup.lat), longitude: Number(pickup.lng) }
      : null

  const dropoffCoord =
    dropoff && dropoff.lat !== null && dropoff.lng !== null
      ? { latitude: Number(dropoff.lat), longitude: Number(dropoff.lng) }
      : null

  const courierCoord =
    courier && courier.lat !== null && courier.lng !== null
      ? { latitude: Number(courier.lat), longitude: Number(courier.lng) }
      : null

  const region = resolveRegion([pickupCoord, dropoffCoord, courierCoord])

  const routeCoords = routePoints
    .filter((point) => point && point.lat !== null && point.lng !== null)
    .map((point) => ({
      latitude: Number(point.lat),
      longitude: Number(point.lng),
    }))

  const trackedPath = positions
    .filter((point) => point && point.lat !== null && point.lng !== null)
    .map((point) => ({
      latitude: Number(point.lat),
      longitude: Number(point.lng),
    }))

  const routeLine = [pickupCoord, dropoffCoord].filter(Boolean)
  const courierLine = trackedPath.length < 2 ? [courierCoord, dropoffCoord].filter(Boolean) : []

  return (
    <View style={styles.wrapper}>
      <MapView style={styles.map} initialRegion={region} region={region}>
        {pickupCoord ? <Marker coordinate={pickupCoord} title={pickup?.label ?? 'Pickup'} /> : null}
        {dropoffCoord ? <Marker coordinate={dropoffCoord} title={dropoff?.label ?? 'Dropoff'} /> : null}
        {courierCoord ? <Marker coordinate={courierCoord} title={courier?.label ?? 'Estafeta'} /> : null}
        {routeCoords.length >= 2 ? (
          <Polyline coordinates={routeCoords} strokeColor="#f97316" strokeWidth={3} />
        ) : routeLine.length === 2 ? (
          <Polyline coordinates={routeLine} strokeColor="#f97316" strokeWidth={3} />
        ) : null}
        {trackedPath.length >= 2 ? (
          <Polyline coordinates={trackedPath} strokeColor="#2563eb" strokeWidth={3} />
        ) : null}
        {courierLine.length === 2 ? (
          <Polyline coordinates={courierLine} strokeColor="#2563eb" strokeWidth={3} lineDashPattern={[8, 8]} />
        ) : null}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dfe4ec',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
})
