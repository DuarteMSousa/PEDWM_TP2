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

const ITEM_LABELS = {
  PENDING: 'Pendente',
  PREPARING: 'A preparar',
  READY: 'Pronto',
  CANCELLED: 'Cancelado',
}

function toneFor(kind, status) {
  if (status === 'DELIVERED' || status === 'COMPLETED' || status === 'READY' || status === 'PICKED_UP' || status === 'OUT_FOR_DELIVERY') {
    return 'done'
  }
  if (status === 'CANCELLED' || status === 'FAILED') return 'off'
  if (status === 'PENDING') return 'pending'
  return 'prep'
}

export function StatusBadge({ kind = 'order', status }) {
  const labels =
    kind === 'delivery'
      ? DELIVERY_LABELS
      : kind === 'payment'
        ? PAYMENT_LABELS
        : kind === 'item'
          ? ITEM_LABELS
          : ORDER_LABELS

  return (
    <span className={`rb-chip ${toneFor(kind, status)}`}>{labels[status] ?? status ?? '-'}</span>
  )
}
