import { Text, View } from 'react-native'
import { MobileStatusPill } from '../../components/MobileStatusPill'
import { styles } from '../../styles'

export function ClientDiscoveryScreen() {
  const restaurants = [
    { name: 'Urban Grill', eta: '22-28 min', fee: '1.90 EUR', rating: '4.8' },
    { name: 'Bao & Bowl', eta: '18-24 min', fee: '2.20 EUR', rating: '4.6' },
    { name: 'Green Lab', eta: '25-31 min', fee: '1.50 EUR', rating: '4.7' },
  ]

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Explorar restaurantes e menus</Text>
      <Text style={styles.cardSubtitle}>
        Descoberta por zona com categorias, rating e tempo estimado de entrega.
      </Text>

      <View style={styles.ucRow}>
        <Text style={styles.ucPill}>UC01</Text>
      </View>

      <Text style={styles.sectionLabel}>Zona selecionada</Text>
      <View style={styles.rowBetween}>
        <View>
          <Text style={styles.rowTitle}>Rua 5 de Outubro, Porto</Text>
          <Text style={styles.rowMeta}>Raio de entrega: 4.5 km</Text>
        </View>
        <MobileStatusPill tone="info" label="Ativo" />
      </View>

      <Text style={styles.sectionLabel}>Destaques perto de ti</Text>
      {restaurants.map((restaurant) => (
        <View key={restaurant.name} style={styles.rowBetween}>
          <View>
            <Text style={styles.rowTitle}>{restaurant.name}</Text>
            <Text style={styles.rowMeta}>
              {restaurant.eta} · Taxa {restaurant.fee}
            </Text>
          </View>
          <MobileStatusPill tone="success" label={`${restaurant.rating} ★`} />
        </View>
      ))}
    </View>
  )
}
