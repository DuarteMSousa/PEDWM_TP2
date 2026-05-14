import { StyleSheet, Text, View } from 'react-native'

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

export function DeliveryMapCard({ title = 'Mapa de entrega', subtitle, pickup, dropoff, courier }) {
  const points = normalizePoints([
    pickup ? { ...pickup, key: 'pickup', label: pickup.label ?? 'Pickup', tone: 'pickup' } : null,
    dropoff ? { ...dropoff, key: 'dropoff', label: dropoff.label ?? 'Dropoff', tone: 'dropoff' } : null,
    courier ? { ...courier, key: 'courier', label: courier.label ?? 'Estafeta', tone: 'courier' } : null,
  ])

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.mapBox}>
        <View style={styles.gridLineH} />
        <View style={[styles.gridLineH, { top: '66%' }]} />
        <View style={styles.gridLineV} />
        <View style={[styles.gridLineV, { left: '66%' }]} />

        {points.map((point) => (
          <View
            key={point.key}
            style={[
              styles.pin,
              point.tone === 'pickup' ? styles.pickup : null,
              point.tone === 'dropoff' ? styles.dropoff : null,
              point.tone === 'courier' ? styles.courier : null,
              {
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
              },
            ]}
          >
            <Text style={styles.pinText}>{point.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendItem}>Pickup</Text>
        <Text style={styles.legendItem}>Dropoff</Text>
        <Text style={styles.legendItem}>Estafeta</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 12,
  },
  title: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
  },
  mapBox: {
    marginTop: 10,
    height: 210,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6deea',
    backgroundColor: '#edf5ff',
    overflow: 'hidden',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33%',
    height: 1,
    backgroundColor: '#d3dff0',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 1,
    backgroundColor: '#d3dff0',
  },
  pin: {
    position: 'absolute',
    transform: [{ translateX: -26 }, { translateY: -14 }],
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  pickup: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
  },
  dropoff: {
    backgroundColor: '#eef2ff',
    borderColor: '#93c5fd',
  },
  courier: {
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
  },
  pinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  legend: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  legendItem: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
})
