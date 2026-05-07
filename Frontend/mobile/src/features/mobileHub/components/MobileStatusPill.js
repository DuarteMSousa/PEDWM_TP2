import { Text } from 'react-native'
import { styles } from '../styles'

const STATUS_STYLES = {
  success: styles.statusSuccess,
  warning: styles.statusWarning,
  info: styles.statusInfo,
  danger: styles.statusDanger,
}

export function MobileStatusPill({ tone = 'info', label }) {
  return <Text style={[styles.statusPill, STATUS_STYLES[tone] ?? styles.statusInfo]}>{label}</Text>
}
