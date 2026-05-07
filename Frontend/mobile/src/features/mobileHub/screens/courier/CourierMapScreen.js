import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function CourierMapScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mapa da rota ativa</Text>
      <Text style={styles.cardSubtitle}>
        Placeholder visual para mapa interativo com polylines e posicao em tempo real.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC04</Text>
      </View>

      <View style={styles.mapMock}>
        <View>
          <Text style={styles.rowTitle}>Rota Urban Grill → Campanha</Text>
          <Text style={styles.rowMeta}>Atualizacao de posicao: 6s</Text>
        </View>
        <View>
          <View style={styles.mapPinRow}>
            <Text style={styles.mapPin}>Pickup</Text>
            <Text style={styles.mapPin}>Dropoff</Text>
          </View>
          <View style={styles.mapRoad} />
          <View style={styles.mapRoad} />
        </View>
      </View>

      <View style={styles.miniGrid}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Distancia restante</Text>
          <Text style={styles.miniValue}>3.1 km</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>ETA</Text>
          <Text style={styles.miniValue}>8 min</Text>
        </View>
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Navegacao ativa</Text>
          <Text style={styles.rowMeta}>Rua de Costa Cabral · transito moderado</Text>
        </View>
        <MobileStatusPill tone="success" label="AO VIVO" />
      </View>
    </View>
  )
}
