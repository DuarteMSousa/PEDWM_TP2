import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import * as Location from 'expo-location'
import MapView, { Marker } from 'react-native-maps'

const DEFAULT_REGION = {
  latitude: 41.1579,
  longitude: -8.6291,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
}

function toRegion(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return DEFAULT_REGION
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }
}

export function AddressMapPicker({ latitude, longitude, onChange }) {
  const initialLat = Number(latitude)
  const initialLng = Number(longitude)
  const [marker, setMarker] = useState(
    Number.isFinite(initialLat) && Number.isFinite(initialLng)
      ? { latitude: initialLat, longitude: initialLng }
      : null,
  )
  const [region, setRegion] = useState(toRegion(initialLat, initialLng))
  const [permissionState, setPermissionState] = useState('unknown')
  const mapRef = useRef(null)

  useEffect(() => {
    const nextLat = Number(latitude)
    const nextLng = Number(longitude)
    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
      setMarker({ latitude: nextLat, longitude: nextLng })
      setRegion(toRegion(nextLat, nextLng))
    }
  }, [latitude, longitude])

  function handlePress(event) {
    const coord = event?.nativeEvent?.coordinate
    if (!coord) return
    setMarker({ latitude: coord.latitude, longitude: coord.longitude })
    if (onChange) onChange({ latitude: coord.latitude, longitude: coord.longitude })
  }

  async function handleUseCurrent() {
    try {
      const existing = await Location.getForegroundPermissionsAsync()
      let status = existing.status
      if (status !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync()
        status = requested.status
      }
      setPermissionState(status)
      if (status !== 'granted') return

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const next = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      setMarker(next)
      setRegion(toRegion(next.latitude, next.longitude))
      if (mapRef.current) {
        mapRef.current.animateToRegion(toRegion(next.latitude, next.longitude), 400)
      }
      if (onChange) onChange(next)
    } catch {
      // ignore
    }
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Selecione a localizacao</Text>
        <Pressable style={styles.gpsBtn} onPress={handleUseCurrent}>
          <Text style={styles.gpsBtnText}>Usar GPS</Text>
        </Pressable>
      </View>
      <View style={styles.mapBox}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onPress={handlePress}
        >
          {marker ? <Marker coordinate={marker} /> : null}
        </MapView>
      </View>
      <Text style={styles.hint}>
        Toca no mapa para definir o ponto de entrega. As coordenadas sao guardadas automaticamente.
      </Text>
      {permissionState === 'denied' ? (
        <Text style={styles.warn}>Permissao de localizacao negada.</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  gpsBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3479ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gpsBtnText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  mapBox: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d6deea',
    backgroundColor: '#edf5ff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  hint: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
  },
  warn: {
    marginTop: 6,
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
})
