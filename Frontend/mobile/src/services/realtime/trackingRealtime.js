import { getEchoClient } from './echoClient'

export function subscribeToOrderTracking({ orderId, authToken, onPositionUpdated, onError }) {
  const echo = getEchoClient({ authToken })
  const channelName = `order.${orderId}.tracking`
  const channel = echo.private(channelName)

  channel.listen('.COURIER_POSITION_UPDATED', (payload) => {
    if (onPositionUpdated) {
      onPositionUpdated(payload)
    }
  })

  channel.error((error) => {
    if (onError) {
      onError(error)
    }
  })

  return () => {
    echo.leave(channelName)
  }
}
