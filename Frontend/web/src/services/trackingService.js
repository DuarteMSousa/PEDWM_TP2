import { buildAuthHeaders, graphqlRequest } from './apiClient'

const ORDER_TRACKING_QUERY = `
  query OrderTracking($orderId: ID!) {
    orderTracking(order_id: $orderId) {
      order_id
      order_status
      delivery_id
      delivery_status
      courier_id
      restaurant_name
      customer_name
      pickup_latitude
      pickup_longitude
      dropoff_latitude
      dropoff_longitude
      route_provider
      route_distance_km
      route_duration_seconds
      route_points {
        lat
        lng
      }
      distance_km_remaining
      eta_seconds
      latest_position {
        lat
        lng
        recorded_at
      }
      positions {
        lat
        lng
        recorded_at
      }
      events {
        event_type
        timestamp
      }
    }
  }
`

export async function fetchWebOrderTracking({ orderId, token, devUserId }) {
  const data = await graphqlRequest({
    query: ORDER_TRACKING_QUERY,
    variables: { orderId },
    headers: buildAuthHeaders({
      token,
      devUserId,
    }),
  })

  return data.orderTracking
}
