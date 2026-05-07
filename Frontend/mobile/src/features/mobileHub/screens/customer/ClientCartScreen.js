import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function ClientCartScreen() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Carrinho da encomenda</Text>
      <Text style={styles.cardSubtitle}>
        Quantidades, opcoes e total em tempo real com base em `RestaurantProduct`.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC02</Text>
      </View>

      <Text style={styles.sectionLabel}>Itens selecionados</Text>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>2x Smash Burger</Text>
          <Text style={styles.rowMeta}>Sem cebola · extra cheddar</Text>
        </View>
        <Text style={styles.amount}>23.80 EUR</Text>
      </View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>1x Batata Trufada</Text>
          <Text style={styles.rowMeta}>Molho a parte</Text>
        </View>
        <Text style={styles.amount}>4.50 EUR</Text>
      </View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>1x Kombucha Ginger</Text>
          <Text style={styles.rowMeta}>330 ml</Text>
        </View>
        <Text style={styles.amount}>3.20 EUR</Text>
      </View>

      <Text style={styles.sectionLabel}>Resumo de custos</Text>
      <View style={styles.miniGrid}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Subtotal</Text>
          <Text style={styles.miniValue}>31.50 EUR</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Entrega</Text>
          <Text style={styles.miniValue}>1.90 EUR</Text>
        </View>
      </View>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Total</Text>
          <Text style={styles.rowMeta}>Cupao LUNCH5 aplicado</Text>
        </View>
        <MobileStatusPill tone="success" label="31.90 EUR" />
      </View>
    </View>
  )
}
