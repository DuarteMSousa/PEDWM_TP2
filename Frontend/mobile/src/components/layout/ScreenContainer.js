import { SafeAreaView, StyleSheet, View } from 'react-native'
import { colors } from '../../theme/colors'

export function ScreenContainer({ children }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.glowTop} />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glowTop: {
    position: 'absolute',
    top: -130,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: '#24486f',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    padding: 18,
  },
})
