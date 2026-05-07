import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function CourierDeliveryFlowScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Fluxo da entrega</Text>
      <Text style={styles.cardSubtitle}>
        Estados de `Delivery` com registo de eventos para auditoria e tracking cliente.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC12</Text>
        <Text style={styles.ucPill}>UC13</Text>
        <Text style={styles.ucPill}>UC14</Text>
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>1. Cheguei ao restaurante</Text>
          <Text style={styles.timelineMeta}>DELIVERY_ACCEPTED · 12:19</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>2. Encomenda recolhida</Text>
          <Text style={styles.timelineMeta}>DELIVERY_PICKED_UP · 12:31</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>3. Em transito para cliente</Text>
          <Text style={styles.timelineMeta}>DELIVERY_IN_TRANSIT · 12:33</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>4. Entregue com sucesso</Text>
          <Text style={styles.timelineMeta}>DELIVERY_DELIVERED · previsto 12:41</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Estado atual</Text>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Pedido FB-1042</Text>
          <Text style={styles.rowMeta}>Cliente: Joana Cardoso</Text>
        </View>
        <MobileStatusPill tone="info" label="IN_TRANSIT" />
      </View>
    </View>
  )
}
