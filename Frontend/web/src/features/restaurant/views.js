import { RestaurantOrdersQueueScreen } from './screens/RestaurantOrdersQueueScreen'
import { RestaurantVirtualKitchenScreen } from './screens/RestaurantVirtualKitchenScreen'
import { RestaurantMenuCatalogScreen } from './screens/RestaurantMenuCatalogScreen'
import { RestaurantChatScreen } from './screens/RestaurantChatScreen'
import { RestaurantNotificationsScreen } from './screens/RestaurantNotificationsScreen'

export const RESTAURANT_VIEWS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'DB',
    Component: RestaurantOrdersQueueScreen,
  },
  {
    id: 'kitchen',
    label: 'Cozinha virtual',
    icon: 'KV',
    badge: 3,
    Component: RestaurantVirtualKitchenScreen,
  },
  {
    id: 'menu',
    label: 'Gestao de menu',
    icon: 'GM',
    Component: RestaurantMenuCatalogScreen,
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: 'CH',
    Component: RestaurantChatScreen,
  },
  {
    id: 'notifications',
    label: 'Notificacoes',
    icon: 'NT',
    Component: RestaurantNotificationsScreen,
  },
]
