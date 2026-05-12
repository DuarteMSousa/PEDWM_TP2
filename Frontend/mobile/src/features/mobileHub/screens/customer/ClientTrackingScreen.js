import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'
import { subscribeToOrderTracking } from '../../../../services/realtime/trackingRealtime'

const TRACKING_ORDER_ID = process.env.EXPO_PUBLIC_TRACKING_ORDER_ID ?? ''
const AUTH_TOKEN = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN ?? ''

export function ClientTrackingScreen() {
  const [realtimeState, setRealtimeState] = useState('offline')
  const [lastPosition, setLastPosition] = useState(null)

  useEffect(() => {
    if (!TRACKING_ORDER_ID) {
      setRealtimeState('missing-order-id')
      return undefined
    }

    try {
      const unsubscribe = subscribeToOrderTracking({
        orderId: TRACKING_ORDER_ID,
        authToken: AUTH_TOKEN,
        onPositionUpdated: (payload) => {
          setLastPosition(payload)
          setRealtimeState('live')
        },
        onError: () => {
          setRealtimeState('error')
        },
      })

      setRealtimeState('connecting')

      return () => {
        unsubscribe()
      }
    } catch (error) {
      setRealtimeState('error')
      return undefined
    }
  }, [])

  const realtimeLabel =
    realtimeState === 'live'
      ? 'AO VIVO'
      : realtimeState === 'connecting'
        ? 'A ligar'
        : realtimeState === 'missing-order-id'
          ? 'Sem orderId'
          : 'Offline'

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Tracking em tempo real</Text>
      <Text style={styles.cardSubtitle}>
        Estado da encomenda e localizacao do estafeta com eventos push.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC04</Text>
        <Text style={styles.ucPill}>UC15</Text>
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Pedido FB-1042</Text>
          <Text style={styles.rowMeta}>Estafeta: Ricardo Lemos - mota</Text>
        </View>
        <MobileStatusPill tone={realtimeState === 'live' ? 'success' : 'warning'} label={realtimeLabel} />
      </View>

      <View style={styles.mapMock}>
        <View>
          <Text style={styles.rowTitle}>Mapa de entrega</Text>
          <Text style={styles.rowMeta}>Atualizacao da posicao a cada 7 segundos</Text>
        </View>
        <View>
          <View style={styles.mapPinRow}>
            <Text style={styles.mapPin}>Restaurante</Text>
            <Text style={styles.mapPin}>Cliente</Text>
          </View>
          <View style={styles.mapRoad} />
          <View style={styles.mapRoad} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Timeline</Text>
      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>ORDER_READY</Text>
          <Text style={styles.timelineMeta}>12:27 - Cozinha marcou como pronto</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>ORDER_PICKED_UP</Text>
          <Text style={styles.timelineMeta}>12:31 - Estafeta recolheu pedido</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>COURIER_POSITION_UPDATED</Text>
          <Text style={styles.timelineMeta}>
            {lastPosition
              ? `lat ${Number(lastPosition.lat).toFixed(5)} | lng ${Number(lastPosition.lng).toFixed(5)}`
              : 'Aguardando eventos do canal order.{orderId}.tracking'}
          </Text>
        </View>
      </View>
    </View>
  )
}
