import { subscribeToOrderTrackingTopic } from './topicsRealtime'

export function subscribeToOrderTracking({ orderId, authToken, devUserId, onPositionUpdated, onError }) {
  return subscribeToOrderTrackingTopic({
    orderId,
    authToken,
    devUserId,
    onPositionUpdated,
    onError,
  })
}
