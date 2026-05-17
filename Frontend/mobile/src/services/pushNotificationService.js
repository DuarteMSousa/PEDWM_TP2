import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { buildAuthHeaders, graphqlRequest } from './apiClient'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

const REGISTER_PUSH_TOKEN_MUTATION = `
  mutation RegisterPushToken($userId: ID!, $input: RegisterPushTokenInput!) {
    registerPushToken(user_id: $userId, input: $input) {
      ok
      push_token_id
      is_active
    }
  }
`

function sessionUserId(session) {
  return session?.userId || session?.devUserId
}

function platformName() {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return Platform.OS
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') {
    return
  }

  await Notifications.setNotificationChannelAsync('fastbite', {
    name: 'FastBite',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2f6fe9',
  })
}

export async function registerDevicePushToken(session) {
  const userId = sessionUserId(session)

  if (!userId) {
    return null
  }

  await ensureAndroidChannel()

  const existingPermission = await Notifications.getPermissionsAsync()
  let finalStatus = existingPermission.status

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync()
    finalStatus = requestedPermission.status
  }

  if (finalStatus !== 'granted') {
    return null
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data

  const data = await graphqlRequest({
    query: REGISTER_PUSH_TOKEN_MUTATION,
    variables: {
      userId,
      input: {
        token,
        provider: 'expo',
        platform: platformName(),
      },
    },
    headers: buildAuthHeaders({
      devUserId: session?.devUserId,
      token: session?.token,
    }),
  })

  return data.registerPushToken
}
