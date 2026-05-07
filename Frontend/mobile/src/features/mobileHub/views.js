import { ClientDiscoveryScreen } from './screens/customer/ClientDiscoveryScreen'
import { ClientCartScreen } from './screens/customer/ClientCartScreen'
import { ClientCheckoutScreen } from './screens/customer/ClientCheckoutScreen'
import { ClientTrackingScreen } from './screens/customer/ClientTrackingScreen'
import { ClientProfileScreen } from './screens/customer/ClientProfileScreen'
import { CourierAvailabilityScreen } from './screens/courier/CourierAvailabilityScreen'
import { CourierShiftStartScreen } from './screens/courier/CourierShiftStartScreen'
import { CourierJobOffersScreen } from './screens/courier/CourierJobOffersScreen'
import { CourierJobDetailScreen } from './screens/courier/CourierJobDetailScreen'
import { CourierDeliveryFlowScreen } from './screens/courier/CourierDeliveryFlowScreen'
import { CourierMapScreen } from './screens/courier/CourierMapScreen'

export const CLIENT_VIEWS = [
  { id: 'client-discovery', label: 'Explorar', Component: ClientDiscoveryScreen },
  { id: 'client-cart', label: 'Carrinho', Component: ClientCartScreen },
  { id: 'client-checkout', label: 'Checkout', Component: ClientCheckoutScreen },
  { id: 'client-tracking', label: 'Tracking', Component: ClientTrackingScreen },
  { id: 'client-profile', label: 'Perfil', Component: ClientProfileScreen },
]

export const COURIER_VIEWS = [
  { id: 'courier-shift-start', label: 'Inicio turno', Component: CourierShiftStartScreen },
  { id: 'courier-availability', label: 'Disponibilidade', Component: CourierAvailabilityScreen },
  { id: 'courier-job-offers', label: 'Ofertas', Component: CourierJobOffersScreen },
  { id: 'courier-job-detail', label: 'Detalhe oferta', Component: CourierJobDetailScreen },
  { id: 'courier-delivery-flow', label: 'Entrega', Component: CourierDeliveryFlowScreen },
  { id: 'courier-map', label: 'Mapa', Component: CourierMapScreen },
]
