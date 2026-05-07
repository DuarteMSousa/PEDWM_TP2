import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function CourierJobDetailScreen() {
  const rejectionReasons = [
    'Distancia demasiado alta para o SLA',
    'Trabalho atual ainda em curso',
    'Problema tecnico no veiculo',
    'Zona sem cobertura de dados',
  ]

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Detalhe da oferta FB-1042</Text>
      <Text style={styles.cardSubtitle}>
        Rever pickup/dropoff, tempo e valor antes de aceitar ou rejeitar.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC11</Text>
        <Text style={styles.ucPill}>UC13</Text>
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Pickup</Text>
          <Text style={styles.rowMeta}>Urban Grill · Rua de Cedofeita 120</Text>
        </View>
        <MobileStatusPill tone="info" label="1.4 km" />
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Dropoff</Text>
          <Text style={styles.rowMeta}>Campanha · Rua 5 de Outubro 201</Text>
        </View>
        <MobileStatusPill tone="warning" label="ETA 18 min" />
      </View>

      <View style={styles.miniGrid}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Taxa entrega</Text>
          <Text style={styles.miniValue}>4.80 EUR</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Timeout oferta</Text>
          <Text style={styles.miniValue}>00:23</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Motivos de rejeicao</Text>
      <View style={styles.timeline}>
        {rejectionReasons.map((reason) => (
          <View style={styles.timelineItem} key={reason}>
            <Text style={styles.timelineTitle}>{reason}</Text>
            <Text style={styles.timelineMeta}>Registado em auditoria de eventos</Text>
          </View>
        ))}
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Aceitar oferta</Text>
          <Text style={styles.rowMeta}>Bloqueia job para este estafeta</Text>
        </View>
        <MobileStatusPill tone="success" label="Aceitar" />
      </View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Rejeitar com motivo</Text>
          <Text style={styles.rowMeta}>Passa para proximo estafeta elegivel</Text>
        </View>
        <MobileStatusPill tone="danger" label="Rejeitar" />
      </View>
    </View>
  )
}
