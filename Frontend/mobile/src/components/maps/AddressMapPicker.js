import { StyleSheet, Text, View } from 'react-native'

// Fallback para web: nao tenta carregar react-native-maps.
export function AddressMapPicker() {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>
        Mapa interativo apenas disponivel no telefone. Introduz latitude e longitude
        manualmente abaixo.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6deea',
    backgroundColor: '#f8fafc',
  },
  text: {
    color: '#64748b',
    fontSize: 12,
  },
})
