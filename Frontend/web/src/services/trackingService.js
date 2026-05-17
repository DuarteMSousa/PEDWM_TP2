import { buildAuthHeaders, graphqlRequest } from './apiClient'

function mapPosition(position) {
  if (!position) return null

  return {
    lat: Number(position.latitude),
    lng: Number(position.longitude),
    recorded_at: position.timestamp,
  }
}

function mapTracking(payload) {
  const order = payload?.order
  const delivery = payload?.delivery
  const positions = (delivery?.positionHistory ?? []).map(mapPosition).filter(Boolean).reverse()

  return {
    order_id: order?.id ?? null,
    order_status: order?.status ?? null,
    delivery_id: delivery?.id ?? null,
    delivery_status: delivery?.status ?? null,
    courier_id: delivery?.courier_id ?? payload?.courier?.user_id ?? null,
    restaurant_name: order?.restaurant_name_snapshot ?? '',
    customer_name: order?.user?.name ?? '',
    pickup_latitude: order?.restaurant?.address?.latitude ?? null,
    pickup_longitude: order?.restaurant?.address?.longitude ?? null,
    dropoff_latitude: order?.address?.latitude ?? null,
    dropoff_longitude: order?.address?.longitude ?? null,
    route_provider: 'backend',
    route_distance_km: null,
    route_duration_seconds: null,
    route_points: [],
    distance_km_remaining: null,
    eta_seconds: payload?.eta_seconds ?? null,
    latest_position: mapPosition(payload?.last_position) ?? positions[0] ?? null,
    positions,
    events: order?.events ?? [],
  }
}

const ORDER_TRACKING_QUERY = `
  query OrderTracking($userId: ID!, $orderId: ID!) {
    orderTracking(user_id: $userId, order_id: $orderId) {
      eta_seconds
      last_position { latitude longitude timestamp }
      courier { user_id }
      order {
        id
        status
        restaurant_name_snapshot
        user { name }
        address { latitude longitude }
        restaurant { address { latitude longitude } }
        events { event_type timestamp }
      }
      delivery {
        id
        courier_id
        status
        positionHistory { latitude longitude timestamp }
      }
    }
  }
`

export async function fetchWebOrderTracking({ orderId, token, devUserId }) {
  const data = await graphqlRequest({
    query: ORDER_TRACKING_QUERY,
    variables: {
      userId: devUserId,
      orderId,
    },
    headers: buildAuthHeaders({
      token,
      devUserId,
    }),
  })

  return mapTracking(data.orderTracking)
}
