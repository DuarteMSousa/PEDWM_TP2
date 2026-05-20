import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, SafeAreaView, ScrollView, Text, TextInput, Vibration, View } from 'react-native'
import { styles } from './courier/styles'
import * as Location from 'expo-location'
import NetInfo from '@react-native-community/netinfo'
import { NativeDeliveryMapCard } from '../components/maps/NativeDeliveryMapCard'
import {
  acceptDeliveryJob,
  createOrderChat,
  fetchCourierAvailableDeliveries,
  fetchCourierDeliveriesHistory,
  fetchOrderChats,
  fetchOrderTracking,
  markDeliveryFailed,
  rejectDeliveryJob,
  sendChatMessage,
  toggleCourierAvailability,
  updateCourierLocation,
  updateDeliveryStatus,
} from '../services/commerceService'
import {
  subscribeToChatTopic,
  subscribeToCourierJobsTopic,
  subscribeToOrderTrackingTopic,
} from '../services/realtime/topicsRealtime'
import {
  startBackgroundLocation,
  stopBackgroundLocation,
} from '../services/backgroundLocationTask'
import { openGoogleMaps, openWaze } from '../services/navigationLinks'

const OFFER_EXPIRY_FALLBACK_SECONDS = 30

function statusText(status) {
  if (status === 'AVAILABLE') return 'Online'
  if (status === 'BUSY') return 'Ocupado'
  return 'Offline'
}

function distanceMeters(a, b) {
  if (!a || !b) return null

  const earthRadius = 6371000
  const dLat = ((Number(b.lat) - Number(a.lat)) * Math.PI) / 180
  const dLng = ((Number(b.lng) - Number(a.lng)) * Math.PI) / 180
  const lat1 = (Number(a.lat) * Math.PI) / 180
  const lat2 = (Number(b.lat) * Math.PI) / 180

  const value =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return earthRadius * (2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)))
}

export function CourierAppScreen({ session, pushStatus, onLogout, deepLink, onConsumeDeepLink }) {
  const [courierStatus, setCourierStatus] = useState('OFFLINE')
  const [phase, setPhase] = useState('offer')
  const [availableOffers, setAvailableOffers] = useState([])
  const [activeDelivery, setActiveDelivery] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [livePosition, setLivePosition] = useState(null)
  const [toast, setToast] = useState('')
  const [errorText, setErrorText] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [jobsRealtimeState, setJobsRealtimeState] = useState('offline')
  const [locationPermission, setLocationPermission] = useState('unknown')
  const [backgroundLocationPermission, setBackgroundLocationPermission] = useState('unknown')
  const [jobsRetryTick, setJobsRetryTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [activeOfferId, setActiveOfferId] = useState(null)
  const [dismissedOfferIds, setDismissedOfferIds] = useState(() => new Set())
  const [offerRemainingSeconds, setOfferRemainingSeconds] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingOfferId, setRejectingOfferId] = useState('')
  const [showFailModal, setShowFailModal] = useState(false)
  const [failReason, setFailReason] = useState('')
  const [isFailingDelivery, setIsFailingDelivery] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [history, setHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false)
  const [readyBanner, setReadyBanner] = useState(false)
  const [chatModalState, setChatModalState] = useState({
    visible: false,
    chat: null,
    messages: [],
    type: null,
  })
  const [chatDraft, setChatDraft] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const lastSentRef = useRef({ lat: null, lng: null, timestamp: 0 })
  const courierId = session?.userId || session?.devUserId

  const activeOffer = useMemo(
    () => availableOffers.find((offer) => offer.offer_token === activeOfferId) ?? null,
    [activeOfferId, availableOffers],
  )

  const isOffer = phase === 'offer'
  const isPickup = phase === 'pickup'
  const isCollected = phase === 'collected'
  const isTransit = phase === 'in_transit'
  const isCompleted = phase === 'completed'

  const mainButton = useMemo(() => {
    if (isPickup) return { label: 'Cheguei ao Restaurante', nextStatus: 'PICKED_UP', nextPhase: 'collected' }
    if (isCollected) return { label: 'Encomenda Recolhida', nextStatus: 'IN_TRANSIT', nextPhase: 'in_transit' }
    if (isTransit) return { label: 'Entregue com Sucesso', nextStatus: 'DELIVERED', nextPhase: 'completed' }
    if (isCompleted) return { label: 'Nova entrega', nextStatus: null, nextPhase: 'offer' }
    return null
  }, [isPickup, isCollected, isTransit, isCompleted])

  function ensureOnline(actionLabel) {
    if (isOnline) {
      return true
    }

    setErrorText(`Sem internet. Nao foi possivel ${actionLabel}.`)
    return false
  }

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected && state.isInternetReachable !== false)
      setIsOnline(nextOnline)
      if (!nextOnline) {
        setJobsRealtimeState('offline')
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!courierId || !isOnline) {
      setJobsRealtimeState('offline')
      return undefined
    }

    let unsubscribe = null
    let retryTimer = null
    let cancelled = false

    const connect = () => {
      if (cancelled) return

      setJobsRealtimeState('connecting')
      try {
        unsubscribe = subscribeToCourierJobsTopic({
          courierId,
          authToken: session?.token,
          devUserId: session?.devUserId,
          onEvent: (eventName, payload) => {
            setJobsRealtimeState('live')
            setToast(`Evento realtime: ${eventName}`)

            if (eventName === 'JOB_OFFERED' && courierStatus === 'AVAILABLE' && phase === 'offer') {
              loadAvailableOffers()
            }

            if (eventName === 'JOB_EXPIRED' || eventName === 'JOB_REJECTED') {
              const expiredOfferId = payload?.data?.offer_id ?? payload?.offerId ?? null
              if (expiredOfferId) {
                setDismissedOfferIds((current) => {
                  const updated = new Set(current)
                  updated.add(String(expiredOfferId))
                  return updated
                })
              }
              loadAvailableOffers()
            }

            if (eventName === 'DELIVERY_FAILED') {
              setErrorText(payload?.data?.reason ?? 'Entrega marcada como falhada.')
            }
          },
          onError: () => {
            setJobsRealtimeState('error')
            retryTimer = setTimeout(() => {
              setJobsRetryTick((value) => value + 1)
            }, 5000)
          },
        })
      } catch {
        setJobsRealtimeState('error')
        retryTimer = setTimeout(() => {
          setJobsRetryTick((value) => value + 1)
        }, 5000)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      if (unsubscribe) unsubscribe()
    }
  }, [
    courierId,
    courierStatus,
    phase,
    isOnline,
    session?.token,
    session?.devUserId,
    jobsRetryTick,
  ])

  useEffect(() => {
    if (!activeDelivery?.order_id || isCompleted) {
      return undefined
    }

    const timer = setInterval(() => {
      loadTracking(activeDelivery.order_id)
    }, 12000)

    return () => clearInterval(timer)
  }, [activeDelivery, isCompleted])

  useEffect(() => {
    if (!chatModalState.visible || !chatModalState.chat?.id) return undefined
    let unsubscribe = null
    try {
      unsubscribe = subscribeToChatTopic({
        chatId: chatModalState.chat.id,
        authToken: session?.token,
        devUserId: session?.devUserId,
        onMessage: (payload) => {
          setChatModalState((current) => {
            if (!current.visible) return current
            const incoming = {
              id: payload?.eventId ?? `${Date.now()}-${Math.random()}`,
              content: payload?.content ?? '',
              sender_participant_id: payload?.senderUserId ?? 'desconhecido',
              timestamp: payload?.timestamp ?? new Date().toISOString(),
              source: 'socket',
            }
            if (current.messages.some((message) => message.id === incoming.id)) return current
            return { ...current, messages: [incoming, ...current.messages].slice(0, 80) }
          })
        },
        onError: () => {},
      })
    } catch {
      // ignore
    }
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [chatModalState.visible, chatModalState.chat?.id, session?.token, session?.devUserId])

  useEffect(() => {
    if (!activeDelivery?.order_id || isCompleted || !isOnline) {
      return undefined
    }

    let unsubscribe = null
    try {
      unsubscribe = subscribeToOrderTrackingTopic({
        orderId: activeDelivery.order_id,
        authToken: session?.token,
        devUserId: session?.devUserId,
        onEvent: (eventName, payload) => {
          if (eventName === 'ORDER_CANCELLED') {
            setErrorText('Pedido cancelado pelo cliente ou restaurante.')
            stopBackgroundLocation().catch(() => {})
            setActiveDelivery(null)
            setTracking(null)
            setPhase('offer')
            setCourierStatus('AVAILABLE')
            return
          }
          if (eventName === 'ORDER_DELIVERED' || eventName === 'DELIVERY_DELIVERED') {
            stopBackgroundLocation().catch(() => {})
            loadTracking(activeDelivery.order_id)
          }
          if (eventName === 'DELIVERY_FAILED') {
            stopBackgroundLocation().catch(() => {})
          }
          if (eventName === 'ORDER_READY') {
            setToast('Pedido pronto para recolha.')
            setReadyBanner(true)
          }
        },
        onError: () => {
          // silent
        },
      })
    } catch {
      // ignore
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [activeDelivery?.order_id, isCompleted, isOnline, session?.token, session?.devUserId])

  useEffect(() => {
    const phaseAllowsTracking = ['pickup', 'collected', 'in_transit'].includes(phase)
    if (!activeDelivery?.delivery_id || !phaseAllowsTracking) {
      stopBackgroundLocation().catch(() => {})
      return undefined
    }

    if (backgroundLocationPermission === 'granted') {
      startBackgroundLocation({
        session,
        deliveryId: activeDelivery.delivery_id,
      }).catch((err) => {
        setToast(`Background tracking falhou: ${err.message ?? err}`)
      })
    }

    let subscription = null
    let isStopped = false

    async function startWatcher() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync()
        setLocationPermission(permission.status)

        if (permission.status !== 'granted') {
          setToast('Permissao de localizacao em primeiro plano negada.')
          return
        }

        const backgroundPermission = await Location.requestBackgroundPermissionsAsync()
        setBackgroundLocationPermission(backgroundPermission.status)

        if (backgroundPermission.status !== 'granted') {
          setToast('Permissao de localizacao em background negada. Tracking ativo apenas com app aberta.')
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 8000,
            distanceInterval: 15,
          },
          async (location) => {
            if (isStopped) {
              return
            }

            const lat = Number(location.coords.latitude)
            const lng = Number(location.coords.longitude)
            const recordedAt = new Date(location.timestamp ?? Date.now()).toISOString()

            const last = lastSentRef.current
            const nowMs = Date.now()
            const movedMeters =
              last.lat !== null && last.lng !== null
                ? distanceMeters({ lat: last.lat, lng: last.lng }, { lat, lng })
                : null
            const elapsedMs = nowMs - Number(last.timestamp || 0)
            const shouldSend =
              last.lat === null ||
              (movedMeters !== null && movedMeters >= 15) ||
              elapsedMs >= 10000

            setLivePosition({ lat, lng })

            if (!shouldSend) {
              return
            }

            lastSentRef.current = { lat, lng, timestamp: nowMs }

            try {
              await updateCourierLocation({
                session,
                deliveryId: activeDelivery.delivery_id,
                lat,
                lng,
                heading:
                  location.coords.heading !== null && location.coords.heading !== undefined
                    ? Number(location.coords.heading)
                    : null,
                speed:
                  location.coords.speed !== null && location.coords.speed !== undefined
                    ? Number(location.coords.speed)
                    : null,
                accuracy:
                  location.coords.accuracy !== null && location.coords.accuracy !== undefined
                    ? Number(location.coords.accuracy)
                    : null,
                recordedAt,
              })

              setTracking((state) => ({
                ...(state ?? {}),
                latest_position: {
                  lat,
                  lng,
                  recorded_at: recordedAt,
                },
                positions: [
                  {
                    lat,
                    lng,
                    recorded_at: recordedAt,
                  },
                  ...((state?.positions ?? []).slice(0, 19)),
                ],
              }))
            } catch {
              // Ignore intermittent send failures; next GPS callback retries naturally.
            }
          },
        )
      } catch {
        setToast('Falha ao iniciar GPS em tempo real.')
      }
    }

    startWatcher()

    return () => {
      isStopped = true
      if (subscription) {
        subscription.remove()
      }
    }
  }, [
    activeDelivery?.delivery_id,
    phase,
    session,
  ])

  useEffect(() => {
    if (courierStatus !== 'AVAILABLE' || phase !== 'offer') {
      return undefined
    }

    loadAvailableOffers()
    const timer = setInterval(() => {
      loadAvailableOffers()
    }, 15000)

    return () => clearInterval(timer)
  }, [courierStatus, phase])

  useEffect(() => {
    if (phase !== 'offer' || courierStatus !== 'AVAILABLE') {
      if (activeOfferId !== null) {
        setActiveOfferId(null)
      }
      return
    }

    const nextOffer = availableOffers.find(
      (offer) => offer.offer_token && !dismissedOfferIds.has(offer.offer_token),
    )

    if (!nextOffer) {
      if (activeOfferId !== null) {
        setActiveOfferId(null)
      }
      return
    }

    if (activeOfferId !== nextOffer.offer_token) {
      setActiveOfferId(nextOffer.offer_token)
      setRejectReason('')
      // Padrao de vibracao: pausa, vibra, pausa, vibra — chama atencao tipo Uber.
      try {
        Vibration.vibrate([0, 400, 200, 400])
      } catch {
        // silent — alguns dispositivos podem nao suportar
      }
    }
  }, [availableOffers, courierStatus, phase, dismissedOfferIds, activeOfferId])

  useEffect(() => {
    if (!activeOffer) {
      setOfferRemainingSeconds(null)
      return undefined
    }

    function computeRemaining() {
      if (!activeOffer.offer_expires_at) {
        return OFFER_EXPIRY_FALLBACK_SECONDS
      }
      const expiresAtMs = Date.parse(activeOffer.offer_expires_at)
      if (Number.isNaN(expiresAtMs)) {
        return OFFER_EXPIRY_FALLBACK_SECONDS
      }
      const diffSec = Math.ceil((expiresAtMs - Date.now()) / 1000)
      return diffSec > 0 ? diffSec : 0
    }

    setOfferRemainingSeconds(computeRemaining())
    const timer = setInterval(() => {
      const next = computeRemaining()
      setOfferRemainingSeconds(next)
      if (next <= 0) {
        setDismissedOfferIds((current) => {
          const updated = new Set(current)
          updated.add(activeOffer.offer_token)
          return updated
        })
        loadAvailableOffers()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [activeOffer])

  async function handleToggleOnline() {
    if (!ensureOnline('alterar disponibilidade')) {
      return
    }

    try {
      setLoading(true)
      const nextStatus = courierStatus === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE'
      const payload = await toggleCourierAvailability({ session, status: nextStatus })
      setCourierStatus(payload.status)
      setToast(nextStatus === 'AVAILABLE' ? 'Estafeta online.' : 'Estafeta offline.')
      if (nextStatus === 'OFFLINE') {
        setAvailableOffers([])
      }
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetCourierStatus(nextStatus) {
    if (!ensureOnline('alterar estado')) return
    if (courierStatus === nextStatus) return

    try {
      setLoading(true)
      const payload = await toggleCourierAvailability({ session, status: nextStatus })
      setCourierStatus(payload.status)
      setToast(`Estado: ${payload.status}.`)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAcceptOffer(offer) {
    if (!ensureOnline('aceitar oferta')) {
      return
    }

    try {
      setLoading(true)
      const payload = await acceptDeliveryJob({
        session,
        deliveryId: offer.delivery_id,
        offerToken: offer.offer_token,
      })

      setActiveDelivery(payload)
      setCourierStatus('BUSY')
      setPhase('pickup')
      setLivePosition(null)
      lastSentRef.current = { lat: null, lng: null, timestamp: 0 }
      setActiveOfferId(null)
      setDismissedOfferIds(new Set())
      setRejectReason('')
      setToast('Entrega aceite com sucesso.')
      setErrorText('')
      await loadTracking(payload.order_id)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRejectOffer(offer, reason = null) {
    if (!ensureOnline('rejeitar oferta')) {
      return
    }

    try {
      setRejectingOfferId(offer.offer_token)
      await rejectDeliveryJob({
        session,
        offerToken: offer.offer_token,
        reason: reason && reason.trim() !== '' ? reason.trim() : null,
      })
      setDismissedOfferIds((current) => {
        const updated = new Set(current)
        updated.add(offer.offer_token)
        return updated
      })
      setRejectReason('')
      setToast('Oferta rejeitada.')
      setErrorText('')
      await loadAvailableOffers()
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setRejectingOfferId('')
    }
  }

  function dismissActiveOfferModal() {
    if (!activeOffer) return
    setDismissedOfferIds((current) => {
      const updated = new Set(current)
      updated.add(activeOffer.offer_token)
      return updated
    })
  }

  async function loadAvailableOffers() {
    if (!isOnline) {
      return
    }

    try {
      const offers = await fetchCourierAvailableDeliveries(session, { limit: 20 })
      setAvailableOffers(offers)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    }
  }

  async function handleProgress() {
    if (!ensureOnline('atualizar estado da entrega')) {
      return
    }

    if (!mainButton) {
      return
    }

    if (!activeDelivery?.delivery_id || !mainButton.nextStatus) {
      setPhase(mainButton.nextPhase)
      if (mainButton.nextPhase === 'offer') {
        setActiveDelivery(null)
      }
      return
    }

    if (mainButton.nextStatus === 'DELIVERED') {
      setErrorText('')
      setShowDeliverConfirm(true)
      return
    }

    await progressDelivery(mainButton.nextStatus, mainButton.nextPhase)
  }

  async function progressDelivery(nextStatus, nextPhase) {
    try {
      setLoading(true)
      const payload = await updateDeliveryStatus({
        session,
        deliveryId: activeDelivery.delivery_id,
        status: nextStatus,
      })

      setPhase(nextPhase)
      setToast(`Estado atualizado para ${payload.delivery_status}.`)
      if (nextStatus === 'PICKED_UP') {
        setReadyBanner(false)
      }

      if (nextStatus === 'DELIVERED') {
        setCourierStatus('AVAILABLE')
        setReadyBanner(false)
        stopBackgroundLocation().catch(() => {})
      }

      await loadTracking(payload.order_id)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmDeliverDelivery() {
    if (!activeDelivery?.delivery_id) {
      setShowDeliverConfirm(false)
      return
    }

    await progressDelivery('DELIVERED', 'completed')
    setShowDeliverConfirm(false)
  }

  async function loadTracking(orderId) {
    if (!isOnline) {
      return
    }

    try {
      const payload = await fetchOrderTracking({ session, orderId })
      setTracking(payload)
      if (payload?.latest_position) {
        setLivePosition({
          lat: Number(payload.latest_position.lat),
          lng: Number(payload.latest_position.lng),
        })
      }
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    }
  }

  // Deep link de push (ex: JOB_OFFERED) -> mostrar ofertas / abrir tracking.
  useEffect(() => {
    if (!deepLink?.orderId) return
    if (deepLink.target && deepLink.target !== 'tracking' && deepLink.target !== 'jobs') return

    if (deepLink.target === 'jobs') {
      setPhase('offer')
    } else if (activeDelivery?.order_id === deepLink.orderId) {
      loadTracking(deepLink.orderId)
    }

    if (onConsumeDeepLink) onConsumeDeepLink()
  }, [deepLink])

  async function loadHistory() {
    if (!ensureOnline('carregar historico')) {
      return
    }

    try {
      setIsLoadingHistory(true)
      const data = await fetchCourierDeliveriesHistory({ session })
      setHistory(data)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  function openHistoryModal() {
    setShowHistoryModal(true)
    loadHistory()
  }

  const historyStats = useMemo(() => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartMs = todayStart.getTime()

    let todayCount = 0
    let todayEarnings = 0
    let totalCount = 0
    let totalEarnings = 0
    let failedCount = 0

    history.forEach((delivery) => {
      totalCount += 1
      if (delivery.delivery_status === 'FAILED') {
        failedCount += 1
        return
      }
      if (delivery.delivery_status !== 'DELIVERED') {
        return
      }
      const fee = Number(delivery.delivery_fee ?? 0)
      totalEarnings += fee

      const completedAt = delivery.delivery_time
        ? Date.parse(delivery.delivery_time)
        : null
      if (completedAt !== null && !Number.isNaN(completedAt) && completedAt >= todayStartMs) {
        todayCount += 1
        todayEarnings += fee
      }
    })

    return {
      todayCount,
      todayEarnings,
      totalCount,
      totalEarnings,
      failedCount,
    }
  }, [history])

  async function handleFailDelivery() {
    if (!activeDelivery?.delivery_id) {
      setShowFailModal(false)
      return
    }

    if (!ensureOnline('marcar entrega como falhada')) {
      return
    }

    const trimmedReason = failReason.trim()
    if (!trimmedReason) {
      setErrorText('Motivo da falha e obrigatorio.')
      return
    }

    try {
      setIsFailingDelivery(true)
      await markDeliveryFailed({
        session,
        deliveryId: activeDelivery.delivery_id,
        reason: trimmedReason,
      })
      setToast('Entrega marcada como falhada.')
      setErrorText('')
      setShowFailModal(false)
      setFailReason('')
      setPhase('offer')
      setActiveDelivery(null)
      setTracking(null)
      setLivePosition(null)
      setCourierStatus('AVAILABLE')
      stopBackgroundLocation().catch(() => {})
      lastSentRef.current = { lat: null, lng: null, timestamp: 0 }
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsFailingDelivery(false)
    }
  }

  async function openChatForActiveDelivery(targetType) {
    if (!activeDelivery?.order_id) {
      setErrorText('Sem entrega ativa para abrir chat.')
      return
    }
    if (!ensureOnline('abrir chat')) return

    try {
      setChatLoading(true)
      const existing = await fetchOrderChats({
        session,
        orderId: activeDelivery.order_id,
      })
      let target = existing.find((chat) => chat.type === targetType) ?? null
      if (!target) {
        const participantIds = [courierId]
        if (tracking?.order?.user_id) participantIds.push(tracking.order.user_id)
        target = await createOrderChat({
          session,
          orderId: activeDelivery.order_id,
          type: targetType,
          participantUserIds: participantIds,
        })
      }
      setChatModalState({
        visible: true,
        chat: target,
        messages: target.messages ?? [],
        type: targetType,
      })
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setChatLoading(false)
    }
  }

  async function handleSendChatMessage() {
    const draft = chatDraft.trim()
    if (!draft || !chatModalState.chat?.id) return
    if (!ensureOnline('enviar mensagem')) return
    setChatDraft('')
    try {
      setChatSending(true)
      const sent = await sendChatMessage({
        session,
        chatId: chatModalState.chat.id,
        content: draft,
      })
      setChatModalState((current) => ({
        ...current,
        messages: [{ ...sent, source: 'mutation' }, ...current.messages].slice(0, 80),
      }))
    } catch (error) {
      setErrorText(error.message)
      setChatDraft(draft)
    } finally {
      setChatSending(false)
    }
  }

  function closeChatModal() {
    setChatModalState({ visible: false, chat: null, messages: [], type: null })
    setChatDraft('')
  }

  function resetFlow() {
    setPhase('offer')
    setActiveDelivery(null)
    setTracking(null)
    setLivePosition(null)
    setActiveOfferId(null)
    setDismissedOfferIds(new Set())
    setRejectReason('')
    lastSentRef.current = { lat: null, lng: null, timestamp: 0 }
    stopBackgroundLocation().catch(() => {})
    setToast('Pronto para nova entrega.')
    if (courierStatus === 'AVAILABLE') {
      loadAvailableOffers()
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          {toast ? (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}

          <View style={styles.headerTop}>
            <View style={styles.brandWrap}>
              <View style={styles.brandIcon}>
                <Text style={styles.brandIconText}>{"\\uD83D\\uDEB4"}</Text>
              </View>
              <View>
                <Text style={styles.brand}>FastBite</Text>
                <Text style={styles.brandSub}>Estafeta</Text>
              </View>
            </View>
            <Pressable
              style={[styles.onlineBtn, courierStatus === 'OFFLINE' ? styles.onlineBtnOff : null]}
              onPress={handleToggleOnline}
              disabled={loading}
            >
              <Text style={[styles.onlineBtnText, courierStatus === 'OFFLINE' ? styles.onlineBtnTextOff : null]}>
                {statusText(courierStatus)}
              </Text>
            </Pressable>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.statusChip, isOnline ? styles.statusChipOk : styles.statusChipWarn]}>
              Net: {isOnline ? 'online' : 'offline'}
            </Text>
            <Text
              style={[
                styles.statusChip,
                jobsRealtimeState === 'live' ? styles.statusChipOk : styles.statusChipWarn,
              ]}
            >
              Jobs: {jobsRealtimeState}
            </Text>
            <Text
              style={[
                styles.statusChip,
                locationPermission === 'granted' ? styles.statusChipOk : styles.statusChipWarn,
              ]}
            >
              GPS: {locationPermission}
            </Text>
            <Text
              style={[
                styles.statusChip,
                backgroundLocationPermission === 'granted' ? styles.statusChipOk : styles.statusChipWarn,
              ]}
            >
              BG: {backgroundLocationPermission}
            </Text>
            <Text
              style={[
                styles.statusChip,
                pushStatus === 'registered' ? styles.statusChipOk : styles.statusChipWarn,
              ]}
            >
              Push: {pushStatus === 'registered' ? 'ok' : pushStatus === 'permission_denied' ? 'off' : pushStatus}
            </Text>
          </View>

          <View style={styles.statusToggleRow}>
            {['AVAILABLE', 'BUSY', 'OFFLINE'].map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.statusToggle,
                  courierStatus === option ? styles.statusToggleActive : null,
                ]}
                onPress={() => handleSetCourierStatus(option)}
              >
                <Text
                  style={[
                    styles.statusToggleText,
                    courierStatus === option ? styles.statusToggleTextActive : null,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.historyLink} onPress={openHistoryModal}>
            <Text style={styles.historyLinkText}>Ver historico & ganhos</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, mainButton ? styles.contentWithBottom : null]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Fluxo de entrega</Text>

          {readyBanner ? (
            <Pressable style={styles.readyBanner} onPress={() => setReadyBanner(false)}>
              <Text style={styles.readyBannerTitle}>Pedido pronto para recolha</Text>
              <Text style={styles.readyBannerText}>
                A cozinha marcou o pedido como pronto. Dirige-te ao restaurante.
              </Text>
            </Pressable>
          ) : null}

          {!isOnline ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Sem internet. Operacoes remotas e realtime estao temporariamente indisponiveis.
              </Text>
            </View>
          ) : null}

          {isOffer ? (
            <View style={styles.card}>
              <Text style={styles.offerId}>Entregas disponiveis</Text>
              <Text style={styles.offerRestaurant}>
                {courierStatus === 'AVAILABLE'
                  ? `${availableOffers.length} entrega(s) pendente(s).`
                  : 'Fica online para ver ofertas.'}
              </Text>

              {courierStatus === 'AVAILABLE' ? (
                <>
                  <Pressable style={styles.secondaryBtn} onPress={loadAvailableOffers} disabled={loading}>
                    <Text style={styles.secondaryBtnText}>Atualizar ofertas</Text>
                  </Pressable>

                  {availableOffers.length === 0 ? (
                    <Text style={styles.offerMeta}>Sem entregas pendentes neste momento.</Text>
                  ) : (
                    availableOffers.map((offer) => (
                      <View key={offer.delivery_id} style={styles.card}>
                        <SummaryRow label="Restaurante" value={offer.restaurant_name} />
                        <SummaryRow label="Total" value={`EUR ${Number(offer.order_total ?? 0).toFixed(2)}`} />
                        <SummaryRow
                          label="Distancia pickup"
                          value={
                            offer.estimated_pickup_distance_km !== null &&
                            offer.estimated_pickup_distance_km !== undefined
                              ? `${Number(offer.estimated_pickup_distance_km).toFixed(2)} km`
                              : '-'
                          }
                        />
                        <SummaryRow
                          label="Tempo estimado pickup"
                          value={
                            offer.estimated_pickup_time_min !== null &&
                            offer.estimated_pickup_time_min !== undefined
                              ? `${offer.estimated_pickup_time_min} min`
                              : '-'
                          }
                        />
                        <SummaryRow label="Pickup" value={offer.pickup_address ?? '-'} />
                        <SummaryRow label="Entrega" value={offer.dropoff_address ?? '-'} />
                        <View style={styles.actionsRow}>
                          <Pressable
                            style={styles.rejectBtn}
                            onPress={() => handleRejectOffer(offer)}
                            disabled={rejectingOfferId === offer.offer_token}
                          >
                            <Text style={styles.rejectBtnText}>
                              {rejectingOfferId === offer.offer_token ? 'A rejeitar...' : 'Rejeitar'}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={styles.acceptBtn}
                            onPress={() => handleAcceptOffer(offer)}
                            disabled={loading}
                          >
                            <Text style={styles.acceptBtnText}>Aceitar entrega</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))
                  )}
                </>
              ) : null}

              <View style={styles.actionsRow}>
                <Pressable style={styles.rejectBtn} onPress={onLogout}>
                  <Text style={styles.rejectBtnText}>Sair</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {activeDelivery ? (
            <View style={styles.card}>
              <Text style={styles.summaryTitle}>Entrega ativa</Text>
              <SummaryRow label="delivery_id" value={activeDelivery.delivery_id} />
              <SummaryRow label="order_id" value={activeDelivery.order_id} />
              <SummaryRow label="delivery_status" value={tracking?.delivery_status ?? activeDelivery.delivery_status} />
              <SummaryRow label="order_status" value={tracking?.order_status ?? '-'} />
              <SummaryRow
                label="distancia restante"
                value={
                  tracking?.distance_km_remaining !== null && tracking?.distance_km_remaining !== undefined
                    ? `${tracking.distance_km_remaining} km`
                    : '-'
                }
              />
              <SummaryRow
                label="eta"
                value={tracking?.eta_seconds ? `${Math.ceil(tracking.eta_seconds / 60)} min` : '-'}
              />
            </View>
          ) : null}

          {activeDelivery ? (
            <NativeDeliveryMapCard
              title="Mapa da rota ativa"
              subtitle="Posicao GPS do estafeta com envio realtime"
              pickup={
                tracking?.pickup_latitude !== null && tracking?.pickup_latitude !== undefined
                  ? { lat: tracking.pickup_latitude, lng: tracking.pickup_longitude, label: 'Pickup' }
                  : null
              }
              dropoff={
                tracking?.dropoff_latitude !== null && tracking?.dropoff_latitude !== undefined
                  ? { lat: tracking.dropoff_latitude, lng: tracking.dropoff_longitude, label: 'Dropoff' }
                  : null
              }
              courier={
                livePosition
                  ? { lat: livePosition.lat, lng: livePosition.lng, label: 'Estafeta' }
                  : tracking?.latest_position
                    ? {
                        lat: tracking.latest_position.lat,
                        lng: tracking.latest_position.lng,
                        label: 'Estafeta',
                      }
                    : null
              }
              routePoints={tracking?.route_points ?? []}
              positions={tracking?.positions ?? []}
            />
          ) : null}

          {activeDelivery && !isCompleted ? (() => {
            // Destino muda consoante a fase: ate PICKED_UP vai ao restaurante,
            // a partir dai vai ao cliente.
            const goingToRestaurant = isPickup
            const navTarget = goingToRestaurant
              ? {
                  lat: tracking?.pickup_latitude,
                  lng: tracking?.pickup_longitude,
                  label: 'Restaurante',
                  address: activeDelivery?.pickup_address,
                }
              : {
                  lat: tracking?.dropoff_latitude,
                  lng: tracking?.dropoff_longitude,
                  label: 'Cliente',
                  address: activeDelivery?.dropoff_address,
                }
            const hasCoords =
              navTarget.lat !== null &&
              navTarget.lat !== undefined &&
              navTarget.lng !== null &&
              navTarget.lng !== undefined
            if (!hasCoords) return null

            return (
              <View style={styles.navigateCard}>
                <Text style={styles.navigateLabel}>
                  {goingToRestaurant ? 'A caminho do restaurante' : 'A caminho do cliente'}
                </Text>
                {navTarget.address ? (
                  <Text style={styles.navigateAddress} numberOfLines={2}>
                    {navTarget.address}
                  </Text>
                ) : null}
                <View style={styles.navigateRow}>
                  <Pressable
                    style={[styles.navigateBtn, styles.navigateBtnMaps]}
                    onPress={() => openGoogleMaps(navTarget)}
                  >
                    <Text style={styles.navigateBtnMapsText}>Google Maps</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.navigateBtn, styles.navigateBtnWaze]}
                    onPress={() => openWaze(navTarget)}
                  >
                    <Text style={styles.navigateBtnWazeText}>Waze</Text>
                  </Pressable>
                </View>
              </View>
            )
          })() : null}

          {activeDelivery && !isCompleted ? (
            <View style={styles.chatButtonsRow}>
              <Pressable
                style={styles.chatBtn}
                onPress={() => openChatForActiveDelivery('CUSTOMER_COURIER')}
                disabled={chatLoading}
              >
                <Text style={styles.chatBtnText}>
                  {chatLoading ? 'A abrir...' : 'Chat com cliente'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.chatBtn}
                onPress={() => openChatForActiveDelivery('CUSTOMER_RESTAURANT')}
                disabled={chatLoading}
              >
                <Text style={styles.chatBtnText}>Chat com restaurante</Text>
              </Pressable>
            </View>
          ) : null}

          {tracking?.events?.length ? (
            <View style={styles.card}>
              <Text style={styles.summaryTitle}>Eventos</Text>
              {tracking.events.map((event) => (
                <SummaryRow
                  key={`${event.event_type}-${event.timestamp}`}
                  label={event.event_type}
                  value={event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '-'}
                />
              ))}
            </View>
          ) : null}

          {activeDelivery && (isPickup || isCollected || isTransit) ? (
            <Pressable
              style={styles.dangerBtn}
              onPress={() => {
                setFailReason('')
                setErrorText('')
                setShowFailModal(true)
              }}
              disabled={loading || isFailingDelivery}
            >
              <Text style={styles.dangerBtnText}>Marcar entrega como falhada</Text>
            </Pressable>
          ) : null}

          {isCompleted ? (
            <Pressable style={styles.secondaryBtn} onPress={resetFlow}>
              <Text style={styles.secondaryBtnText}>Limpar entrega atual</Text>
            </Pressable>
          ) : null}

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          {mainButton ? (
            <Pressable
              style={styles.mainBtn}
              onPress={handleProgress}
              disabled={loading || (!activeDelivery && mainButton.nextPhase !== 'offer')}
            >
              <Text style={styles.mainBtnText}>{loading ? 'A processar...' : mainButton.label}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Modal
        visible={Boolean(activeOffer) && phase === 'offer' && courierStatus === 'AVAILABLE'}
        animationType="slide"
        transparent
        onRequestClose={dismissActiveOfferModal}
      >
        <View style={styles.offerModalBackdrop}>
          <View style={styles.offerModalCard}>
            <View style={styles.offerModalHeader}>
              <Text style={styles.offerModalTitle}>Nova oferta de entrega</Text>
              <Pressable style={styles.offerModalClose} onPress={dismissActiveOfferModal}>
                <Text style={styles.offerModalCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.offerCountdown,
                offerRemainingSeconds !== null && offerRemainingSeconds <= 10
                  ? styles.offerCountdownContainerDanger
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.offerCountdownLabel,
                  offerRemainingSeconds !== null && offerRemainingSeconds <= 10
                    ? styles.offerCountdownDanger
                    : null,
                ]}
              >
                Tempo para aceitar
              </Text>
              <Text
                style={[
                  styles.offerCountdownValue,
                  offerRemainingSeconds !== null && offerRemainingSeconds <= 10
                    ? styles.offerCountdownDanger
                    : null,
                ]}
              >
                {offerRemainingSeconds === null
                  ? '--'
                  : `${String(Math.max(0, offerRemainingSeconds)).padStart(2, '0')}s`}
              </Text>
            </View>

            <View style={styles.offerCountdownBar}>
              <View
                style={[
                  styles.offerCountdownBarFill,
                  {
                    width: `${
                      offerRemainingSeconds === null
                        ? 100
                        : Math.max(
                            0,
                            Math.min(
                              100,
                              (offerRemainingSeconds / OFFER_EXPIRY_FALLBACK_SECONDS) * 100,
                            ),
                          )
                    }%`,
                    backgroundColor:
                      offerRemainingSeconds !== null && offerRemainingSeconds <= 10
                        ? '#dc2626'
                        : '#10b981',
                  },
                ]}
              />
            </View>

            {activeOffer ? (
              <View style={styles.offerModalBody}>
                <SummaryRow label="Restaurante" value={activeOffer.restaurant_name ?? '-'} />
                <SummaryRow
                  label="Total"
                  value={`EUR ${Number(activeOffer.order_total ?? 0).toFixed(2)}`}
                />
                <SummaryRow label="Pickup" value={activeOffer.pickup_address ?? '-'} />
                <SummaryRow label="Entrega" value={activeOffer.dropoff_address ?? '-'} />
                {activeOffer.estimated_pickup_distance_km !== null &&
                activeOffer.estimated_pickup_distance_km !== undefined ? (
                  <SummaryRow
                    label="Distancia pickup"
                    value={`${Number(activeOffer.estimated_pickup_distance_km).toFixed(2)} km`}
                  />
                ) : null}
                {activeOffer.estimated_pickup_time_min !== null &&
                activeOffer.estimated_pickup_time_min !== undefined ? (
                  <SummaryRow
                    label="Tempo estimado pickup"
                    value={`${activeOffer.estimated_pickup_time_min} min`}
                  />
                ) : null}

                <Text style={styles.offerReasonLabel}>Motivo da rejeicao (opcional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: longe demais"
                  placeholderTextColor="#94a3b8"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  editable={rejectingOfferId !== activeOffer.offer_token && !loading}
                />

                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.rejectBtn}
                    onPress={() => handleRejectOffer(activeOffer, rejectReason)}
                    disabled={rejectingOfferId === activeOffer.offer_token || loading}
                  >
                    <Text style={styles.rejectBtnText}>
                      {rejectingOfferId === activeOffer.offer_token ? 'A rejeitar...' : 'Rejeitar'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptOffer(activeOffer)}
                    disabled={loading || rejectingOfferId === activeOffer.offer_token}
                  >
                    <Text style={styles.acceptBtnText}>
                      {loading ? 'A aceitar...' : 'Aceitar entrega'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFailModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isFailingDelivery) {
            setShowFailModal(false)
          }
        }}
      >
        <View style={styles.offerModalBackdrop}>
          <View style={styles.failModalCard}>
            <Text style={styles.offerModalTitle}>Marcar entrega como falhada</Text>
            <Text style={styles.failModalSubtitle}>
              Esta acao e irreversivel. O motivo fica registado no historico da entrega.
            </Text>

            <Text style={styles.offerReasonLabel}>Motivo *</Text>
            <TextInput
              style={[styles.input, styles.failReasonInput]}
              placeholder="Ex: cliente indisponivel, morada incorreta"
              placeholderTextColor="#94a3b8"
              value={failReason}
              onChangeText={setFailReason}
              editable={!isFailingDelivery}
              multiline
            />

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  if (!isFailingDelivery) {
                    setShowFailModal(false)
                  }
                }}
                disabled={isFailingDelivery}
              >
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.dangerBtn, styles.dangerBtnFill]}
                onPress={handleFailDelivery}
                disabled={isFailingDelivery || failReason.trim() === ''}
              >
                <Text style={[styles.dangerBtnText, styles.dangerBtnTextFill]}>
                  {isFailingDelivery ? 'A confirmar...' : 'Confirmar falha'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeliverConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!loading) {
            setShowDeliverConfirm(false)
          }
        }}
      >
        <View style={styles.offerModalBackdrop}>
          <View style={styles.failModalCard}>
            <Text style={styles.offerModalTitle}>Confirmar entrega</Text>
            <Text style={styles.failModalSubtitle}>
              Apos confirmar, a encomenda fica marcada como DELIVERED e o turno volta a estado AVAILABLE.
            </Text>

            <View style={styles.confirmSummary}>
              <SummaryRow
                label="Restaurante"
                value={tracking?.restaurant_name ?? activeDelivery?.restaurant_name ?? '-'}
              />
              <SummaryRow
                label="Encomenda"
                value={`#${String(activeDelivery?.order_id ?? '').slice(0, 8)}`}
              />
              {tracking?.total !== undefined && tracking?.total !== null ? (
                <SummaryRow label="Total" value={`EUR ${Number(tracking.total).toFixed(2)}`} />
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  if (!loading) {
                    setShowDeliverConfirm(false)
                  }
                }}
                disabled={loading}
              >
                <Text style={styles.secondaryBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.acceptBtn}
                onPress={confirmDeliverDelivery}
                disabled={loading}
              >
                <Text style={styles.acceptBtnText}>
                  {loading ? 'A confirmar...' : 'Sim, entregue'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.offerModalBackdrop}>
          <View style={styles.historyModalCard}>
            <View style={styles.offerModalHeader}>
              <Text style={styles.offerModalTitle}>Historico & ganhos</Text>
              <Pressable
                style={styles.offerModalClose}
                onPress={() => setShowHistoryModal(false)}
              >
                <Text style={styles.offerModalCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <View style={styles.historyStatsRow}>
              <View style={styles.historyStatCard}>
                <Text style={styles.historyStatLabel}>Entregues hoje</Text>
                <Text style={styles.historyStatValue}>{historyStats.todayCount}</Text>
              </View>
              <View style={styles.historyStatCard}>
                <Text style={styles.historyStatLabel}>Ganho hoje</Text>
                <Text style={styles.historyStatValue}>
                  EUR {historyStats.todayEarnings.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.historyStatsRow}>
              <View style={styles.historyStatCard}>
                <Text style={styles.historyStatLabel}>Total entregas</Text>
                <Text style={styles.historyStatValue}>{historyStats.totalCount}</Text>
              </View>
              <View style={styles.historyStatCard}>
                <Text style={styles.historyStatLabel}>Ganho total</Text>
                <Text style={styles.historyStatValue}>
                  EUR {historyStats.totalEarnings.toFixed(2)}
                </Text>
              </View>
            </View>

            {historyStats.failedCount > 0 ? (
              <Text style={styles.historyFailedNote}>
                {historyStats.failedCount} entrega(s) falhada(s) no historico.
              </Text>
            ) : null}

            <View style={styles.historyListHeader}>
              <Text style={styles.summaryTitle}>Entregas recentes</Text>
              <Pressable
                style={styles.secondaryBtn}
                onPress={loadHistory}
                disabled={isLoadingHistory}
              >
                <Text style={styles.secondaryBtnText}>
                  {isLoadingHistory ? 'A carregar...' : 'Atualizar'}
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.historyList} contentContainerStyle={styles.historyListContent}>
              {!isLoadingHistory && history.length === 0 ? (
                <Text style={styles.offerMeta}>Sem entregas no historico ainda.</Text>
              ) : null}

              {history.map((delivery) => (
                <View
                  key={delivery.delivery_id}
                  style={[
                    styles.historyItemCard,
                    delivery.delivery_status === 'FAILED' ? styles.historyItemCardFailed : null,
                  ]}
                >
                  <View style={styles.historyItemTop}>
                    <Text style={styles.historyItemRestaurant}>{delivery.restaurant_name}</Text>
                    <Text
                      style={[
                        styles.statusChip,
                        delivery.delivery_status === 'DELIVERED'
                          ? styles.statusChipOk
                          : styles.statusChipWarn,
                      ]}
                    >
                      {delivery.delivery_status}
                    </Text>
                  </View>
                  <Text style={styles.historyItemAddress}>{delivery.dropoff_address}</Text>
                  <View style={styles.historyItemMetaRow}>
                    <Text style={styles.historyItemMeta}>
                      Total: EUR {Number(delivery.order_total).toFixed(2)}
                    </Text>
                    <Text style={styles.historyItemFee}>
                      Taxa: EUR {Number(delivery.delivery_fee).toFixed(2)}
                    </Text>
                  </View>
                  {delivery.delivery_time ? (
                    <Text style={styles.historyItemMeta}>
                      Concluida: {new Date(delivery.delivery_time).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={chatModalState.visible}
        animationType="slide"
        transparent
        onRequestClose={closeChatModal}
      >
        <View style={styles.offerModalBackdrop}>
          <View style={styles.historyModalCard}>
            <View style={styles.offerModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerModalTitle}>
                  Chat com {chatModalState.type === 'CUSTOMER_RESTAURANT' ? 'restaurante' : 'cliente'}
                </Text>
                <Text style={styles.offerMeta}>
                  {chatModalState.chat?.id
                    ? `Chat #${String(chatModalState.chat.id).slice(0, 8)}`
                    : 'A carregar'}
                </Text>
              </View>
              <Pressable style={styles.offerModalClose} onPress={closeChatModal}>
                <Text style={styles.offerModalCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.courierChatList} contentContainerStyle={{ paddingBottom: 8 }}>
              {chatModalState.messages.length === 0 ? (
                <Text style={styles.offerMeta}>Sem mensagens ainda.</Text>
              ) : null}
              {chatModalState.messages.map((message) => {
                const isMine = message.sender_participant_id === courierId
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.courierBubble,
                      isMine ? styles.courierBubbleMine : styles.courierBubbleOther,
                    ]}
                  >
                    <Text style={styles.courierBubbleText}>{message.content}</Text>
                    <Text style={styles.courierBubbleTime}>
                      {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>

            <View style={styles.chatComposeRow}>
              <TextInput
                style={styles.chatInputCourier}
                value={chatDraft}
                onChangeText={setChatDraft}
                placeholder="Mensagem..."
                placeholderTextColor="#94a3b8"
                editable={!chatSending}
                multiline
              />
              <Pressable
                style={styles.acceptBtn}
                onPress={handleSendChatMessage}
                disabled={chatSending || chatDraft.trim() === ''}
              >
                <Text style={styles.acceptBtnText}>
                  {chatSending ? '...' : 'Enviar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value ?? '-'}</Text>
    </View>
  )
}
