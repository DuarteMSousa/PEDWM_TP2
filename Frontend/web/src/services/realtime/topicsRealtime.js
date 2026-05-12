import { getEchoClient } from './echoClient'

export function subscribeToChatTopic({ chatId, authToken, onMessage, onError }) {
  const echo = getEchoClient({ authToken })
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

export function subscribeToUserNotificationsTopic({ userId, authToken, onNotification, onError }) {
  const echo = getEchoClient({ authToken })
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
