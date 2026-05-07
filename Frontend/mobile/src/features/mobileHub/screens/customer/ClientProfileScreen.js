import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function ClientProfileScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Perfil, enderecos e historico</Text>
      <Text style={styles.cardSubtitle}>
        Gestao da conta do cliente com repeticao de pedidos e moradas favoritas.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC17</Text>
        <Text style={styles.ucPill}>UC20</Text>
        <Text style={styles.ucPill}>UC21</Text>
      </View>

      <Text style={styles.sectionLabel}>Moradas</Text>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Casa</Text>
          <Text style={styles.rowMeta}>Rua 5 de Outubro 201, Porto</Text>
        </View>
        <MobileStatusPill tone="info" label="Default" />
      </View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Trabalho</Text>
          <Text style={styles.rowMeta}>Av. da Boavista 910, Porto</Text>
        </View>
        <MobileStatusPill tone="success" label="Ativo" />
      </View>

      <Text style={styles.sectionLabel}>Ultimas encomendas</Text>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>FB-1027 · Urban Grill</Text>
          <Text style={styles.rowMeta}>2x Smash Burger · 29.90 EUR</Text>
        </View>
        <MobileStatusPill tone="success" label="Repetir" />
      </View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>FB-1019 · Green Lab</Text>
          <Text style={styles.rowMeta}>1x Bowl Falafel · 14.10 EUR</Text>
        </View>
        <MobileStatusPill tone="success" label="Repetir" />
      </View>
    </View>
  )
}
