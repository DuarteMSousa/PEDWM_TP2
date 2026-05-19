import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { updateCourierLocation } from './commerceService'

export const BACKGROUND_LOCATION_TASK = 'fastbite-background-location'
const SESSION_STORAGE_KEY = 'fastbite_courier_bg_session'

export async function storeBackgroundSession({ session, deliveryId }) {
  try {
    await AsyncStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ session, deliveryId }),
    )
  } catch {
    // ignore
  }
}

export async function clearBackgroundSession() {
  try {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // ignore
  }
}

async function readSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('Background location task error:', error)
    return
  }
  if (!data) return

  const locations = data.locations ?? []
  if (locations.length === 0) return

  const stored = await readSession()
  if (!stored?.session || !stored?.deliveryId) {
    // Sessao limpa: parar a task para nao queimar GPS indefinidamente.
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      }
    } catch {
      // ignore
    }
    return
  }

  const latest = locations[locations.length - 1]
  try {
    await updateCourierLocation({
      session: stored.session,
      deliveryId: stored.deliveryId,
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      heading: latest.coords.heading,
      speed: latest.coords.speed,
      accuracy: latest.coords.accuracy,
      recordedAt: new Date(latest.timestamp ?? Date.now()).toISOString(),
    })
  } catch (err) {
    // Se o servidor disser que a delivery ja nao esta ativa, parar a task.
    const message = String(err?.message ?? '').toLowerCase()
    const deliveryClosed =
      message.includes('not found') ||
      message.includes('terminal') ||
      message.includes('delivered') ||
      message.includes('cancelled') ||
      message.includes('failed') ||
      message.includes('inactive')
    if (deliveryClosed) {
      try {
        await clearBackgroundSession()
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
        if (isRegistered) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        }
      } catch {
        // ignore
      }
    }
    // restantes erros: proxima iteracao tenta de novo
  }
})

export async function startBackgroundLocation({ session, deliveryId }) {
  await storeBackgroundSession({ session, deliveryId })
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
  if (isRegistered) return

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 20,
    timeInterval: 12000,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'FastBite Estafeta',
      notificationBody: 'A enviar localizacao em segundo plano',
    },
    pausesUpdatesAutomatically: false,
  })
}

export async function stopBackgroundLocation() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK)
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  }
  await clearBackgroundSession()
}
