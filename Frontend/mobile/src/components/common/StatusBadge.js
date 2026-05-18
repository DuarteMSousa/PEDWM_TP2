import { StyleSheet, Text } from 'react-native'

const ORDER_LABELS = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'A preparar',
  READY: 'Pronto',
  OUT_FOR_DELIVERY: 'Em entrega',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const DELIVERY_LABELS = {
  PENDING: 'Pendente',
  PICKED_UP: 'Recolhida',
  IN_TRANSIT: 'Em transito',
  DELIVERED: 'Entregue',
  FAILED: 'Falhada',
}

const PAYMENT_LABELS = {
  PENDING: 'Pendente',
  COMPLETED: 'Pago',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
}

function toneStyle(status) {
  if (status === 'DELIVERED' || status === 'COMPLETED' || status === 'READY' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') {
    return styles.done
  }
  if (status === 'CANCELLED' || status === 'FAILED') return styles.off
  if (status === 'PENDING') return styles.pending
  return styles.prep
}

function toneTextStyle(status) {
  if (status === 'DELIVERED' || status === 'COMPLETED' || status === 'READY' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') {
    return styles.doneText
  }
  if (status === 'CANCELLED' || status === 'FAILED') return styles.offText
  if (status === 'PENDING') return styles.pendingText
  return styles.prepText
}

export function StatusBadge({ kind = 'order', status }) {
  const labels =
    kind === 'delivery' ? DELIVERY_LABELS : kind === 'payment' ? PAYMENT_LABELS : ORDER_LABELS

  return (
    <Text style={[styles.badge, toneStyle(status), toneTextStyle(status)]}>
      {labels[status] ?? status ?? '-'}
    </Text>
  )
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  done: { backgroundColor: '#dcfce7' },
  doneText: { color: '#166534' },
  off: { backgroundColor: '#fee2e2' },
  offText: { color: '#991b1b' },
  prep: { backgroundColor: '#dbeafe' },
  prepText: { color: '#1d4ed8' },
  pending: { backgroundColor: '#fef9c3' },
  pendingText: { color: '#854d0e' },
})
