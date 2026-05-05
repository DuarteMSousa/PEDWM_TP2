import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { PrimaryButton } from '../components/common/PrimaryButton'
import { ScreenContainer } from '../components/layout/ScreenContainer'
import { getApiHealth } from '../services/healthService'
import { colors } from '../theme/colors'

export function HomeScreen() {
  const [status, setStatus] = useState('Sem verificacao ainda.')

  async function handleCheckHealth() {
    try {
      const result = await getApiHealth()
      setStatus(`API online: ${JSON.stringify(result)}`)
    } catch (error) {
      setStatus('Falha ao contactar API. Ajusta EXPO_PUBLIC_API_BASE_URL.')
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>PEDWM TP2</Text>
        <Text style={styles.title}>Frontend Mobile</Text>
        <Text style={styles.subtitle}>
          Estrutura base pronta com components, screens e services.
        </Text>
        <PrimaryButton label="Testar ligacao API" onPress={handleCheckHealth} />
        <Text style={styles.status}>{status}</Text>
      </View>
    </ScreenContainer>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: colors.muted,
    marginTop: 8,
    marginBottom: 16,
  },
  status: {
    color: colors.muted,
    marginTop: 16,
  },
})
