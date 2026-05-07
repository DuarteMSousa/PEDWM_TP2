import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function CourierAvailabilityScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Disponibilidade do estafeta</Text>
      <Text style={styles.cardSubtitle}>
        Estado online/offline e sinal de localizacao para receber atribuicoes.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC10</Text>
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Estado atual</Text>
          <Text style={styles.rowMeta}>Ultima atualizacao: ha 4 segundos</Text>
        </View>
        <MobileStatusPill tone="success" label="ONLINE" />
      </View>

      <View style={styles.miniGrid}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Aceitacao hoje</Text>
          <Text style={styles.miniValue}>89%</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Entregas concluidas</Text>
          <Text style={styles.miniValue}>14</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Regras de disponibilidade</Text>
      <View style={styles.timeline}>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>Heartbeat de localizacao</Text>
          <Text style={styles.timelineMeta}>Enviar posicao a cada 5-10s</Text>
        </View>
        <View style={styles.timelineItem}>
          <Text style={styles.timelineTitle}>Timeout de oferta</Text>
          <Text style={styles.timelineMeta}>30s para aceitar pedido</Text>
        </View>
      </View>
    </View>
  )
}
