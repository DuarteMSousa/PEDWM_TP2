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
