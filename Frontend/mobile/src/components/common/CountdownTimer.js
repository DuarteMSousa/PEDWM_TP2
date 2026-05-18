import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

function formatSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return '--'
  }
  const seconds = Math.max(0, Math.floor(totalSeconds))
  if (seconds < 60) return `${String(seconds).padStart(2, '0')}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function CountdownTimer({ expiresAt, fallbackSeconds = 30, dangerSeconds = 10, onExpire }) {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    function compute() {
      if (!expiresAt) return fallbackSeconds
      const ms = Date.parse(expiresAt)
      if (Number.isNaN(ms)) return fallbackSeconds
      return Math.max(0, Math.ceil((ms - Date.now()) / 1000))
    }

    setRemaining(compute())
    const timer = setInterval(() => {
      const next = compute()
      setRemaining(next)
      if (next <= 0) {
        if (onExpire) onExpire()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresAt, fallbackSeconds, onExpire])

  const isDanger = remaining !== null && remaining <= dangerSeconds

  return (
    <View style={styles.row}>
      <Text style={[styles.value, isDanger ? styles.danger : null]}>{formatSeconds(remaining)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    color: '#065f46',
  },
  danger: {
    color: '#b91c1c',
  },
})
