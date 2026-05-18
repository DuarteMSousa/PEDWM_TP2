import { getEchoClient } from './echoClient'

function listenMany(channel, events, callback) {
  events.forEach((eventName) => {
    channel.listen(`.${eventName}`, (payload) => {
      callback(eventName, payload)
    })
  })
}

export function subscribeToChatTopic({ chatId, authToken, devUserId, onMessage, onError }) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `chat.${chatId}`
  const channel = echo.private(channelName)

  channel.listen('.CHAT_MESSAGE_SENT', (payload) => {
    if (onMessage) {
      onMessage(payload)
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
    if (onNotification) {
      onNotification(payload)
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

export function subscribeToOrderTrackingTopic({
  orderId,
  authToken,
  devUserId,
  onEvent,
  onPositionUpdated,
  onError,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `order.${orderId}.tracking`
  const channel = echo.private(channelName)

  listenMany(
    channel,
    [
      'COURIER_POSITION_UPDATED',
      'ORDER_COURIER_ASSIGNED',
      'ORDER_PICKED_UP',
      'ORDER_OUT_FOR_DELIVERY',
      'ORDER_DELIVERED',
      'DELIVERY_PICKED_UP',
      'DELIVERY_IN_TRANSIT',
      'DELIVERY_DELIVERED',
      'DELIVERY_FAILED',
    ],
    (eventName, payload) => {
      if (eventName === 'COURIER_POSITION_UPDATED' && onPositionUpdated) {
        onPositionUpdated(payload)
      }
      if (onEvent) {
        onEvent(eventName, payload)
      }
    },
  )

  channel.error((error) => {
    if (onError) {
      onError(error)
    }
  })

  return () => {
    echo.leave(channelName)
  }
}

export function subscribeToCourierJobsTopic({
  courierId,
  authToken,
  devUserId,
  onEvent,
  onError,
}) {
  const echo = getEchoClient({ authToken, devUserId })
  const channelName = `courier.${courierId}.jobs`
  const channel = echo.private(channelName)

  listenMany(
    channel,
    [
      'JOB_OFFERED',
      'JOB_ACCEPTED',
      'JOB_REJECTED',
      'JOB_EXPIRED',
      'DELIVERY_ACCEPTED',
      'DELIVERY_PICKED_UP',
      'DELIVERY_IN_TRANSIT',
      'DELIVERY_DELIVERED',
      'DELIVERY_FAILED',
    ],
    (eventName, payload) => {
      if (onEvent) {
        onEvent(eventName, payload)
      }
    },
  )

  channel.error((error) => {
    if (onError) {
      onError(error)
    }
  })

  return () => {
    echo.leave(channelName)
  }
}
