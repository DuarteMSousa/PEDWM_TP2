import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function CourierShiftStartScreen() {
  const checks = [
    'Validar bateria acima de 60%',
    'Ativar permissao de localizacao precisa',
    'Confirmar internet e dados moveis',
    'Confirmar mochila termica pronta',
  ]

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Inicio de turno</Text>
      <Text style={styles.cardSubtitle}>
        Checklist rapido para entrar online e receber ofertas com SLA estavel.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC10</Text>
        <Text style={styles.ucPill}>UC09</Text>
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Estado do turno</Text>
          <Text style={styles.rowMeta}>Janela recomendada: 11:00 - 15:00</Text>
        </View>
        <MobileStatusPill tone="warning" label="Pendente" />
      </View>

      <Text style={styles.sectionLabel}>Checklist de abertura</Text>
      <View style={styles.timeline}>
        {checks.map((check) => (
          <View style={styles.timelineItem} key={check}>
            <Text style={styles.timelineTitle}>{check}</Text>
            <Text style={styles.timelineMeta}>Confirmar antes de ficar online</Text>
          </View>
        ))}
      </View>

      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Pronto para receber ofertas</Text>
          <Text style={styles.rowMeta}>Zona Centro · raio 4km</Text>
        </View>
        <MobileStatusPill tone="success" label="Entrar ONLINE" />
      </View>
    </View>
  )
}
