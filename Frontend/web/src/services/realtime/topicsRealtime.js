import { getEchoClient } from './echoClient'

export function subscribeToChatTopic({ chatId, authToken, devUserId, onMessage, onError }) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `chat.${chatId}`
  const channel = echo.private(channelName)

  channel.listen('.CHAT_MESSAGE_SENT', (payload) => {
    if (onMessage) onMessage(payload)
  })

  channel.error((error) => {
    if (onError) onError(error)
  })

  return () => echo.leave(channelName)
}

export function subscribeToUserNotificationsTopic({
  userId,
  authToken,
  devUserId,
  onNotification,
  onError,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `user.${userId}.notifications`
  const channel = echo.private(channelName)

  channel.listen('.USER_NOTIFICATION_CREATED', (payload) => {
    if (onNotification) onNotification(payload)
  })

  channel.error((error) => {
    if (onError) onError(error)
  })

  return () => echo.leave(channelName)
}

export function subscribeToRestaurantOrdersTopic({
  restaurantId,
  authToken,
  devUserId,
  onEvent,
  onError,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `restaurant.${restaurantId}.orders`
  const channel = echo.private(channelName)

  const eventNames = [
    'ORDER_CREATED',
    'ORDER_CONFIRMED',
    'ORDER_REJECTED',
    'ORDER_PREPARING',
    'ORDER_READY',
    'ORDER_COURIER_ASSIGNED',
    'ORDER_PICKED_UP',
    'ORDER_OUT_FOR_DELIVERY',
    'ORDER_DELIVERED',
    'ORDER_CANCELLED',
  ]

  eventNames.forEach((eventName) => {
    channel.listen(`.${eventName}`, (payload) => {
      if (onEvent) onEvent(eventName, payload)
    })
  })

  channel.error((error) => {
    if (onError) onError(error)
  })

  return () => echo.leave(channelName)
}

export function subscribeToOrderTrackingTopic({
  orderId,
  authToken,
  devUserId,
  onPositionUpdated,
  onError,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `order.${orderId}.tracking`
  const channel = echo.private(channelName)

  channel.listen('.COURIER_POSITION_UPDATED', (payload) => {
    if (onPositionUpdated) onPositionUpdated(payload)
  })

  channel.error((error) => {
    if (onError) onError(error)
  })

  return () => echo.leave(channelName)
}
