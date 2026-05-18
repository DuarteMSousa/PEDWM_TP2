import { RestaurantOrdersQueueScreen } from './screens/RestaurantOrdersQueueScreen'
import { RestaurantVirtualKitchenScreen } from './screens/RestaurantVirtualKitchenScreen'
import { RestaurantMenuCatalogScreen } from './screens/RestaurantMenuCatalogScreen'
import { RestaurantChatScreen } from './screens/RestaurantChatScreen'
import { RestaurantNotificationsScreen } from './screens/RestaurantNotificationsScreen'
import { RestaurantOrderDetailScreen } from './screens/RestaurantOrderDetailScreen'
import { RestaurantOrdersHistoryScreen } from './screens/RestaurantOrdersHistoryScreen'
import { RestaurantReviewsScreen } from './screens/RestaurantReviewsScreen'
import { RestaurantCampaignsScreen } from './screens/RestaurantCampaignsScreen'
import { RestaurantStatsScreen } from './screens/RestaurantStatsScreen'

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
    Component: RestaurantVirtualKitchenScreen,
  },
  {
    id: 'history',
    label: 'Historico',
    icon: 'HS',
    Component: RestaurantOrdersHistoryScreen,
  },
  {
    id: 'stats',
    label: 'Estatisticas',
    icon: 'ST',
    Component: RestaurantStatsScreen,
  },
  {
    id: 'order-detail',
    label: 'Detalhe pedido',
    icon: 'DP',
    Component: RestaurantOrderDetailScreen,
    hideFromNav: true,
  },
  {
    id: 'menu',
    label: 'Gestao de menu',
    icon: 'GM',
    Component: RestaurantMenuCatalogScreen,
  },
  {
    id: 'reviews',
    label: 'Avaliacoes',
    icon: 'AV',
    Component: RestaurantReviewsScreen,
  },
  {
    id: 'campaigns',
    label: 'Campanhas',
    icon: 'CP',
    Component: RestaurantCampaignsScreen,
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
