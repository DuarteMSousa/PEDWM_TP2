import { Pressable, StyleSheet, Text, View } from 'react-native'

export function RatingStars({ rating, max = 5, onChange, size = 28, disabled = false }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max }).map((_, index) => {
        const value = index + 1
        const active = value <= rating
        if (!onChange) {
          return (
            <Text key={value} style={[styles.star, { fontSize: size }, active ? styles.active : null]}>
              {'★'}
            </Text>
          )
        }
        return (
          <Pressable
            key={value}
            style={styles.button}
            onPress={() => onChange(value)}
            disabled={disabled}
          >
            <Text style={[styles.star, { fontSize: size }, active ? styles.active : null]}>
              {'★'}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    color: '#cbd5e1',
  },
  active: {
    color: '#f59e0b',
  },
})
