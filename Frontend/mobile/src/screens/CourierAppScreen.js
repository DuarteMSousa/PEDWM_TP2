import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as Location from 'expo-location'
import NetInfo from '@react-native-community/netinfo'
import { NativeDeliveryMapCard } from '../components/maps/NativeDeliveryMapCard'
import {
  acceptDeliveryJob,
  fetchCourierAvailableDeliveries,
  fetchOrderTracking,
  toggleCourierAvailability,
  updateCourierLocation,
  updateDeliveryStatus,
} from '../services/commerceService'
import { subscribeToCourierJobsTopic } from '../services/realtime/topicsRealtime'

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

export function CourierAppScreen({ session, pushStatus, onLogout }) {
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
  const lastSentRef = useRef({ lat: null, lng: null, timestamp: 0 })
  const courierId = session?.userId || session?.devUserId

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
    const phaseAllowsTracking = ['pickup', 'collected', 'in_transit'].includes(phase)
    if (!activeDelivery?.delivery_id || !phaseAllowsTracking) {
      return undefined
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
            accuracy: Location.Accuracy.Balanced,
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
      setToast('Entrega aceite com sucesso.')
      setErrorText('')
      await loadTracking(payload.order_id)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
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

    try {
      setLoading(true)
      const payload = await updateDeliveryStatus({
        session,
        deliveryId: activeDelivery.delivery_id,
        status: mainButton.nextStatus,
      })

      setPhase(mainButton.nextPhase)
      setToast(`Estado atualizado para ${payload.delivery_status}.`)

      if (mainButton.nextStatus === 'DELIVERED') {
        setCourierStatus('AVAILABLE')
      }

      await loadTracking(payload.order_id)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
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

  function resetFlow() {
    setPhase('offer')
    setActiveDelivery(null)
    setTracking(null)
    setLivePosition(null)
    lastSentRef.current = { lat: null, lng: null, timestamp: 0 }
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
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, mainButton ? styles.contentWithBottom : null]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Fluxo de entrega</Text>

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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  header: {
    backgroundColor: '#07bf4f',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  toast: {
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  toastText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    fontSize: 18,
  },
  brand: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
  },
  brandSub: {
    color: '#dcfce7',
    fontSize: 13,
    marginTop: 2,
  },
  onlineBtn: {
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  onlineBtnOff: {
    backgroundColor: 'transparent',
  },
  onlineBtnText: {
    color: '#0b9b3f',
    fontWeight: '800',
    fontSize: 16,
  },
  onlineBtnTextOff: {
    color: '#fff',
  },
  statusRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  statusChipOk: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusChipWarn: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
  },
  contentWithBottom: {
    paddingBottom: 92,
  },
  sectionTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  warningBox: {
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: '#fef9c3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  warningText: {
    color: '#854d0e',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderColor: '#e4e7ec',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 12,
  },
  offerId: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  offerRestaurant: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 14,
  },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d5dce7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 15,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 17,
  },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#07bf4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  summaryTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  summaryLabel: {
    color: '#475569',
    fontSize: 14,
    flex: 1,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    color: '#991b1b',
    borderColor: '#fecaca',
    borderWidth: 1,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '700',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#d9dee7',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  mainBtn: {
    borderRadius: 12,
    height: 48,
    backgroundColor: '#07bf4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtnText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },
  secondaryBtn: {
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '700',
  },
})
