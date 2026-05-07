import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function ClientCheckoutScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Checkout e pagamento</Text>
      <Text style={styles.cardSubtitle}>
        Validacao final da encomenda, morada de entrega e metodo de pagamento.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC03</Text>
      </View>

      <Text style={styles.sectionLabel}>Entrega</Text>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Casa · Rua 5 de Outubro 201</Text>
          <Text style={styles.rowMeta}>Porto · Campanha · 4350-123</Text>
        </View>
        <MobileStatusPill tone="info" label="Padrão" />
      </View>

      <Text style={styles.sectionLabel}>Pagamento</Text>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>MBWay</Text>
          <Text style={styles.rowMeta}>+351 91X XXX XXX</Text>
        </View>
        <MobileStatusPill tone="success" label="Validado" />
      </View>

      <Text style={styles.sectionLabel}>Confirmacao</Text>
      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>Criar Order + Payment</Text>
          <Text style={styles.timelineMeta}>OrderStatus: PENDING</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>Processar callback de pagamento</Text>
          <Text style={styles.timelineMeta}>PaymentStatus: COMPLETED</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>Publicar evento para restaurante</Text>
          <Text style={styles.timelineMeta}>ORDER_CONFIRMED</Text>
        </View>
      </View>
    </View>
  )
}
