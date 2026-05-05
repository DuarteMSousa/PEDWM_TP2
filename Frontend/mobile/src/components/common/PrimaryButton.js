import { Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../../theme/colors'

export function PrimaryButton({ label, onPress }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    color: '#fff',
    fontWeight: '700',
  },
})
