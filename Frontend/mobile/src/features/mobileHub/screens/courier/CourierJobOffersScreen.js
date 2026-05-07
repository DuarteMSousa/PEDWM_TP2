import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function CourierJobOffersScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ofertas de entrega</Text>
      <Text style={styles.cardSubtitle}>
        Motor de atribuicao com prioridade por proximidade e disponibilidade.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC09</Text>
        <Text style={styles.ucPill}>UC11</Text>
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Pedido FB-1042</Text>
          <Text style={styles.rowMeta}>Pickup: Urban Grill - Dropoff: Campanha</Text>
        </View>
        <MobileStatusPill tone="warning" label="00:23" />
      </View>

      <View style={styles.miniGrid}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Distancia pickup</Text>
          <Text style={styles.miniValue}>1.4 km</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Taxa estimada</Text>
          <Text style={styles.miniValue}>4.80 EUR</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Acoes</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.rowTitle}>Aceitar agora e bloquear rota</Text>
        <MobileStatusPill tone="success" label="Aceitar" />
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.rowTitle}>Ignorar e passar ao proximo estafeta</Text>
        <MobileStatusPill tone="danger" label="Rejeitar" />
      </View>
    </View>
  )
}
