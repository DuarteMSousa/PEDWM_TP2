import { Text } from 'react-native'

export function formatMoney(value, currency = 'EUR') {
  return `${currency} ${Number(value ?? 0).toFixed(2)}`
}

export function MoneyText({ value, currency = 'EUR', style }) {
  return <Text style={style}>{formatMoney(value, currency)}</Text>
}
