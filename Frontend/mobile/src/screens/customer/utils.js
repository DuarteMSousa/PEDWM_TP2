import { styles } from './styles'

export const INBOX_MAX_ITEMS = 60

export const ICON = {
  user: '\u{1F464}',
  search: '\u{1F50D}',
  star: '★',
  time: '\u{1F551}',
  bike: '\u{1F6B4}',
  plus: '+',
  cart: '\u{1F6D2}',
  back: '←',
  minus: '−',
  close: '×',
  check: '✔',
  bell: '\u{1F514}',
  prep: '\u{1F551}',
}

export const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED']
export const TRACKABLE_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']

export function formatCurrency(value) {
  return `EUR ${Number(value ?? 0).toFixed(2)}`
}

export function statusLabel(status) {
  if (status === 'PENDING') return 'Pendente'
  if (status === 'CONFIRMED') return 'Confirmado'
  if (status === 'PREPARING') return 'A preparar'
  if (status === 'READY') return 'Pronto'
  if (status === 'OUT_FOR_DELIVERY') return 'Em entrega'
  if (status === 'DELIVERED') return 'Entregue'
  if (status === 'CANCELLED') return 'Cancelado'
  return status ?? '-'
}

export function paymentMethodLabel(method) {
  if (method === 'CASH') return 'Dinheiro a entrega'
  if (method === 'CARD') return 'Cartao'
  if (method === 'MBWAY') return 'MB Way'
  if (method === 'PAYPAL') return 'PayPal'
  return method
}

export function orderStatusChipStyle(status) {
  if (status === 'DELIVERED') return styles.orderStatusOk
  if (status === 'CANCELLED') return styles.orderStatusOff
  if (status === 'OUT_FOR_DELIVERY' || status === 'READY') return styles.orderStatusGo
  return styles.orderStatusPending
}
