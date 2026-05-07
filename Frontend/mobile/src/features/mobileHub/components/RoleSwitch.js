import { Pressable, Text, View } from 'react-native'
import { styles } from '../styles'

export function RoleSwitch({ role, onChangeRole }) {
  const isCustomer = role === 'customer'

  return (
    <View style={styles.roleRow}>
      <RoleButton label="Cliente" selected={isCustomer} onPress={() => onChangeRole('customer')} />
      <RoleButton label="Estafeta" selected={!isCustomer} onPress={() => onChangeRole('courier')} />
    </View>
  )
}

function RoleButton({ label, onPress, selected }) {
  return (
    <Pressable onPress={onPress} style={[styles.roleButton, selected ? styles.roleButtonActive : null]}>
      <Text style={[styles.roleButtonText, selected ? styles.roleButtonTextActive : null]}>{label}</Text>
    </Pressable>
  )
}
