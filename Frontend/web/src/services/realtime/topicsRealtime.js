import { getEchoClient } from './echoClient'

export function subscribeToChatTopic({ chatId, authToken, devUserId, onMessage, onError, onSubscribed }) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `chat.${chatId}`
  const channel = echo.private(channelName)

  if (onSubscribed && typeof channel.subscribed === 'function') {
    channel.subscribed(() => onSubscribed())
  }

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
  onSubscribed,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `user.${userId}.notifications`
  const channel = echo.private(channelName)

  if (onSubscribed && typeof channel.subscribed === 'function') {
    channel.subscribed(() => onSubscribed())
  }

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
  onSubscribed,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `restaurant.${restaurantId}.orders`
  const channel = echo.private(channelName)

  if (onSubscribed && typeof channel.subscribed === 'function') {
    channel.subscribed(() => onSubscribed())
  }

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
  onSubscribed,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `order.${orderId}.tracking`
  const channel = echo.private(channelName)

  if (onSubscribed && typeof channel.subscribed === 'function') {
    channel.subscribed(() => onSubscribed())
  }

  channel.listen('.COURIER_POSITION_UPDATED', (payload) => {
    if (onPositionUpdated) onPositionUpdated(payload)
  })

  channel.error((error) => {
    if (onError) onError(error)
  })

  return () => echo.leave(channelName)
}
