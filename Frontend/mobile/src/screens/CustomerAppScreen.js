import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { RealtimeTopicsCard } from '../components/realtime/RealtimeTopicsCard'
import { NativeDeliveryMapCard } from '../components/maps/NativeDeliveryMapCard'
import {
  addCartItem,
  cancelClientOrderById,
  checkoutCart,
  createClientAddress,
  createClientReview,
  deleteClientReview,
  fetchClientReviewsHistory,
  updateClientReview,
  deleteClientAddress,
  updateClientAddress,
  createOrderChat,
  fetchChatMessages,
  fetchOrderChats,
  markChatRead,
  sendChatMessage,
  updateClientUser,
  fetchClientAddresses,
  fetchClientNotifications,
  fetchClientOrderDetail,
  fetchClientOrdersHistory,
  fetchMyCart,
  fetchMyOrders,
  fetchOrderPayment,
  fetchOrderTracking,
  fetchProductOptionGroups,
  fetchRestaurantMenu,
  fetchRestaurants,
  payPaymentNow,
  markAllClientNotificationsRead,
  markClientNotificationRead,
  removeCartItem,
  repeatClientOrderToCart,
  setDefaultClientAddress,
  updateCartItem,
} from '../services/commerceService'
import { subscribeToOrderTracking } from '../services/realtime/trackingRealtime'
import {
  subscribeToChatTopic,
  subscribeToCustomerOrdersTopic,
  subscribeToUserNotificationsTopic,
} from '../services/realtime/topicsRealtime'

const INBOX_MAX_ITEMS = 60

const ICON = {
  user: '\u{1F464}',
  search: '\u{1F50D}',
  star: '\u2605',
  time: '\u{1F551}',
  bike: '\u{1F6B4}',
  plus: '+',
  cart: '\u{1F6D2}',
  back: '\u2190',
  minus: '\u2212',
  close: '\u00D7',
  check: '\u2714',
  bell: '\u{1F514}',
  prep: '\u{1F551}',
}

function formatCurrency(value) {
  return `EUR ${Number(value ?? 0).toFixed(2)}`
}

function statusLabel(status) {
  if (status === 'PENDING') return 'Pendente'
  if (status === 'CONFIRMED') return 'Confirmado'
  if (status === 'PREPARING') return 'A preparar'
  if (status === 'READY') return 'Pronto'
  if (status === 'OUT_FOR_DELIVERY') return 'Em entrega'
  if (status === 'DELIVERED') return 'Entregue'
  if (status === 'CANCELLED') return 'Cancelado'
  return status ?? '-'
}

export function CustomerAppScreen({ session, pushStatus, onLogout }) {
  const [route, setRoute] = useState('home')
  const [restaurants, setRestaurants] = useState([])
  const [restaurantId, setRestaurantId] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [activeOrderId, setActiveOrderId] = useState('')
  const [lastCheckout, setLastCheckout] = useState(null)
  const [realtimeState, setRealtimeState] = useState('offline')
  const [isOnline, setIsOnline] = useState(true)
  const [notificationState, setNotificationState] = useState('offline')
  const [notificationPreview, setNotificationPreview] = useState(null)
  const [trackingRetryTick, setTrackingRetryTick] = useState(0)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [showInbox, setShowInbox] = useState(false)
  const [inboxItems, setInboxItems] = useState([])
  const [inboxLoading, setInboxLoading] = useState(false)
  const [inboxSavingId, setInboxSavingId] = useState('')
  const [inboxUnreadOnly, setInboxUnreadOnly] = useState(false)
  const inboxUnreadCount = useMemo(
    () => inboxItems.filter((item) => !item.read).length,
    [inboxItems],
  )
  const [ordersHistory, setOrdersHistory] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersPage, setOrdersPage] = useState(1)
  const [hasMoreOrders, setHasMoreOrders] = useState(true)
  const ORDERS_PAGE_SIZE = 15
  const [cancelTargetOrder, setCancelTargetOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancellingOrder, setIsCancellingOrder] = useState(false)
  const [busyOrderId, setBusyOrderId] = useState('')
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [couponCode, setCouponCode] = useState('')
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [addressDraft, setAddressDraft] = useState({
    label: '',
    street: '',
    city: '',
    postal_code: '',
    country: 'Portugal',
    latitude: '',
    longitude: '',
    is_default: false,
  })
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [deleteAddressTarget, setDeleteAddressTarget] = useState(null)
  const [optionsTargetProduct, setOptionsTargetProduct] = useState(null)
  const [optionGroups, setOptionGroups] = useState([])
  const [optionSelections, setOptionSelections] = useState({})
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [optionQuantity, setOptionQuantity] = useState(1)
  const [pendingPayment, setPendingPayment] = useState(null)
  const [paymentRemainingSeconds, setPaymentRemainingSeconds] = useState(null)
  const [isPayingNow, setIsPayingNow] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [clientReviews, setClientReviews] = useState([])
  const [showReviewsHistory, setShowReviewsHistory] = useState(false)
  const [editingReview, setEditingReview] = useState(null)
  const [orderDetailModal, setOrderDetailModal] = useState({ visible: false, order: null, loading: false })
  const [profileDraft, setProfileDraft] = useState({
    name: session?.name ?? '',
    email: session?.email ?? '',
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [restaurantFilters, setRestaurantFilters] = useState({ q: '', city: '', postalCode: '' })
  const [restaurantsLoading, setRestaurantsLoading] = useState(false)
  const [menuCategory, setMenuCategory] = useState('')
  const [chatModalState, setChatModalState] = useState({
    visible: false,
    chat: null,
    messages: [],
    type: null,
    participants: [],
  })
  const [chatDraft, setChatDraft] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  )

  const userId = session?.userId || session?.devUserId

  const restaurant = useMemo(
    () => restaurants.find((item) => item.id === restaurantId) ?? restaurants[0],
    [restaurantId, restaurants],
  )

  const cartItems = cart?.items ?? []
  const itemCount = cartItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0)
  const deliveryFee = 0
  const total = subtotal + deliveryFee

  function ensureOnline(actionLabel) {
    if (isOnline) {
      return true
    }

    setErrorText(`Sem internet. Nao foi possivel ${actionLabel}.`)
    return false
  }

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected && state.isInternetReachable !== false)
      setIsOnline(nextOnline)
      if (!nextOnline) {
        setRealtimeState('offline')
        setNotificationState('offline')
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (route !== 'tracking' || !activeOrderId) {
      return undefined
    }

    const timer = setInterval(() => {
      loadTracking(activeOrderId)
    }, 15000)

    return () => clearInterval(timer)
  }, [route, activeOrderId])

  useEffect(() => {
    if (!userId || !isOnline) {
      return undefined
    }

    let unsubscribe = null
    let cancelled = false

    try {
      unsubscribe = subscribeToCustomerOrdersTopic({
        customerId: userId,
        authToken: session?.token,
        devUserId: session?.devUserId,
        onEvent: (eventName, payload) => {
          if (cancelled) return

          const eventOrderId = payload?.data?.order_id ?? payload?.orderId ?? null

          if (eventOrderId && activeOrderId && eventOrderId === activeOrderId) {
            loadTracking(eventOrderId)
          }

          if (eventName === 'ORDER_DELIVERED' || eventName === 'ORDER_CANCELLED') {
            setOrdersHistory((current) =>
              current.map((order) =>
                order.id === eventOrderId
                  ? {
                      ...order,
                      status: eventName === 'ORDER_DELIVERED' ? 'DELIVERED' : 'CANCELLED',
                    }
                  : order,
              ),
            )
            if (activeOrderId === eventOrderId && eventName === 'ORDER_CANCELLED') {
              setActiveOrderId('')
            }
          }

          if (eventName === 'PAYMENT_COMPLETED' && pendingPayment?.orderId === eventOrderId) {
            setPendingPayment(null)
            setSuccessText('Pagamento confirmado via realtime.')
            setRoute('tracking')
            loadTracking(eventOrderId)
          }

          if (eventName === 'PAYMENT_FAILED' || eventName === 'PAYMENT_EXPIRED') {
            if (pendingPayment?.orderId === eventOrderId) {
              setPendingPayment(null)
              setErrorText('Pagamento falhado/expirado.')
            }
          }
        },
        onError: () => {
          // canal pode falhar silenciosamente; reconexao via Echo cuida disso
        },
      })
    } catch {
      // ignore
    }

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [userId, isOnline, session?.token, session?.devUserId, activeOrderId, pendingPayment])

  useEffect(() => {
    if (!chatModalState.visible || !chatModalState.chat?.id) {
      return undefined
    }

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
            const exists = current.messages.some((message) => message.id === incoming.id)
            if (exists) return current
            return { ...current, messages: [incoming, ...current.messages].slice(0, 80) }
          })
        },
        onError: () => {
          // ignore silently
        },
      })
    } catch {
      // ignore
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [chatModalState.visible, chatModalState.chat?.id, session?.token, session?.devUserId])

  useEffect(() => {
    if (!pendingPayment) {
      setPaymentRemainingSeconds(null)
      return undefined
    }

    function compute() {
      const elapsedMs = Date.now() - pendingPayment.createdAtMs
      const remainingMs = 10 * 60 * 1000 - elapsedMs
      return Math.max(0, Math.ceil(remainingMs / 1000))
    }

    setPaymentRemainingSeconds(compute())

    const tick = setInterval(() => {
      const next = compute()
      setPaymentRemainingSeconds(next)
      if (next <= 0) {
        setPendingPayment(null)
        setErrorText('Pagamento expirou. Tenta novamente.')
      }
    }, 1000)

    const poll = setInterval(() => {
      refreshPendingPaymentStatus()
    }, 5000)

    return () => {
      clearInterval(tick)
      clearInterval(poll)
    }
  }, [pendingPayment])

  useEffect(() => {
    if (!userId || !isOnline) {
      setNotificationState('offline')
      return undefined
    }

    let unsubscribe = null
    let retryTimer = null
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      setNotificationState('connecting')

      try {
        unsubscribe = subscribeToUserNotificationsTopic({
          userId,
          authToken: session?.token,
          devUserId: session?.devUserId,
          onNotification: (payload) => {
            setNotificationState('live')
            setNotificationPreview({
              title: payload?.title ?? payload?.type ?? 'Notificacao',
              message: payload?.message ?? 'Nova atualizacao recebida.',
            })
            setSuccessText(`${ICON.bell} ${payload?.title ?? 'Nova notificacao'}`)
            setInboxItems((current) => {
              const incoming = {
                id: payload?.notificationId ?? payload?.eventId ?? `${Date.now()}-${Math.random()}`,
                type: payload?.type ?? 'INFO',
                title: payload?.title ?? 'Nova notificacao',
                message: payload?.message ?? 'Sem descricao',
                sent_at: payload?.sentAt ?? new Date().toISOString(),
                read_at: null,
                read: false,
              }
              const next = [incoming, ...current]
              const seen = new Set()
              const deduped = []
              next.forEach((item) => {
                if (seen.has(item.id)) return
                seen.add(item.id)
                deduped.push(item)
              })
              return deduped.slice(0, INBOX_MAX_ITEMS)
            })
          },
          onError: () => {
            setNotificationState('error')
            retryTimer = setTimeout(connect, 6000)
          },
        })
      } catch {
        setNotificationState('error')
        retryTimer = setTimeout(connect, 6000)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      if (unsubscribe) unsubscribe()
    }
  }, [isOnline, session?.devUserId, session?.token, userId])

  useEffect(() => {
    if (route !== 'tracking' || !activeOrderId) {
      setRealtimeState('offline')
      return undefined
    }

    let unsubscribe = null

    try {
      setRealtimeState('connecting')
      unsubscribe = subscribeToOrderTracking({
        orderId: activeOrderId,
        authToken: session?.token,
        devUserId: session?.devUserId,
        onPositionUpdated: (payload) => {
          setRealtimeState('live')
          setTracking((current) => {
            const latest = {
              lat: Number(payload?.lat),
              lng: Number(payload?.lng),
              recorded_at: payload?.recordedAt ?? new Date().toISOString(),
            }

            const previous = current?.positions ?? []
            const nextPositions = [latest, ...previous].slice(0, 20)

            return {
              ...(current ?? {}),
              order_id: payload?.orderId ?? current?.order_id ?? activeOrderId,
              delivery_id: payload?.deliveryId ?? current?.delivery_id ?? null,
              courier_id: payload?.courierId ?? current?.courier_id ?? null,
              latest_position: latest,
              positions: nextPositions,
            }
          })
        },
        onError: () => {
          setRealtimeState('error')
          setTimeout(() => {
            setTrackingRetryTick((value) => value + 1)
          }, 5000)
        },
      })
    } catch {
      setRealtimeState('error')
      setTimeout(() => {
        setTrackingRetryTick((value) => value + 1)
      }, 5000)
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [route, activeOrderId, session?.token, session?.devUserId, trackingRetryTick, isOnline])

  async function bootstrap() {
    if (!ensureOnline('carregar dados iniciais')) {
      return
    }

    try {
      setLoading(true)
      const [nextRestaurants, nextCart, activeOrders, notifications, addressList] =
        await Promise.all([
          fetchRestaurants(session),
          fetchMyCart(session),
          fetchMyOrders(session, { activeOnly: true, limit: 1 }),
          fetchClientNotifications({ session, unreadOnly: false, limit: INBOX_MAX_ITEMS }).catch(
            () => [],
          ),
          fetchClientAddresses(session).catch(() => []),
        ])

      setRestaurants(nextRestaurants)
      if (nextRestaurants.length > 0) {
        setRestaurantId(nextRestaurants[0].id)
      }

      setCart(nextCart)

      if (activeOrders.length > 0) {
        setActiveOrderId(activeOrders[0].id)
      }

      setInboxItems(notifications)
      setAddresses(addressList)
      const defaultAddress = addressList.find((address) => address.is_default) ?? addressList[0]
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id)
      }
      refreshReviewsHistory()
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function reloadAddresses() {
    try {
      const list = await fetchClientAddresses(session)
      setAddresses(list)
      if (!selectedAddressId && list.length > 0) {
        const fallback = list.find((address) => address.is_default) ?? list[0]
        setSelectedAddressId(fallback.id)
      }
    } catch (error) {
      setErrorText(error.message)
    }
  }

  async function handleCreateAddress() {
    const trimmed = {
      street: addressDraft.street.trim(),
      city: addressDraft.city.trim(),
      postal_code: addressDraft.postal_code.trim(),
      country: addressDraft.country.trim(),
      latitude: addressDraft.latitude,
      longitude: addressDraft.longitude,
      label: addressDraft.label.trim() || null,
      is_default: addressDraft.is_default,
    }

    if (!trimmed.street || !trimmed.city || !trimmed.postal_code || !trimmed.country) {
      setErrorText('Preenche rua, cidade, codigo postal e pais.')
      return
    }

    const lat = Number(trimmed.latitude)
    const lng = Number(trimmed.longitude)
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setErrorText('Coordenadas invalidas. Insere latitude e longitude numericas.')
      return
    }

    try {
      setIsSavingAddress(true)
      let savedId
      if (editingAddressId) {
        const updated = await updateClientAddress({
          session,
          addressId: editingAddressId,
          input: { ...trimmed, latitude: lat, longitude: lng },
        })
        savedId = updated.id
        setSuccessText('Morada atualizada.')
      } else {
        const created = await createClientAddress({
          session,
          input: { ...trimmed, latitude: lat, longitude: lng },
        })
        savedId = created.id
        setSuccessText('Morada criada.')
      }
      await reloadAddresses()
      if (savedId) setSelectedAddressId(savedId)
      setShowAddressForm(false)
      setEditingAddressId(null)
      setAddressDraft({
        label: '',
        street: '',
        city: '',
        postal_code: '',
        country: 'Portugal',
        latitude: '',
        longitude: '',
        is_default: false,
      })
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsSavingAddress(false)
    }
  }

  function startEditAddress(address) {
    setEditingAddressId(address.id)
    setAddressDraft({
      label: address.label ?? '',
      street: address.street,
      city: address.city,
      postal_code: address.postal_code,
      country: address.country,
      latitude: String(address.latitude),
      longitude: String(address.longitude),
      is_default: Boolean(address.is_default),
    })
    setShowAddressForm(true)
  }

  async function confirmDeleteAddress() {
    if (!deleteAddressTarget) return
    try {
      setIsSavingAddress(true)
      await deleteClientAddress({ session, addressId: deleteAddressTarget.id })
      const refreshed = addresses.filter((address) => address.id !== deleteAddressTarget.id)
      setAddresses(refreshed)
      if (selectedAddressId === deleteAddressTarget.id) {
        const fallback = refreshed.find((address) => address.is_default) ?? refreshed[0] ?? null
        setSelectedAddressId(fallback?.id ?? null)
      }
      setDeleteAddressTarget(null)
      setSuccessText('Morada apagada.')
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsSavingAddress(false)
    }
  }

  async function handleSetDefaultAddress(addressId) {
    try {
      await setDefaultClientAddress({ session, addressId })
      setAddresses((current) =>
        current.map((address) => ({
          ...address,
          is_default: address.id === addressId,
        })),
      )
      setSelectedAddressId(addressId)
    } catch (error) {
      setErrorText(error.message)
    }
  }

  async function loadInbox({ append = false, currentLimit = INBOX_MAX_ITEMS } = {}) {
    if (!ensureOnline('atualizar inbox')) {
      return
    }

    try {
      setInboxLoading(true)
      const data = await fetchClientNotifications({
        session,
        unreadOnly: false,
        limit: currentLimit,
      })
      setInboxItems(data)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setInboxLoading(false)
    }
  }

  async function loadMoreInbox() {
    const nextLimit = inboxItems.length + INBOX_MAX_ITEMS
    await loadInbox({ currentLimit: nextLimit })
  }

  async function handleMarkInboxItemRead(notificationId) {
    try {
      setInboxSavingId(notificationId)
      await markClientNotificationRead({ session, notificationId })
      const nowIso = new Date().toISOString()
      setInboxItems((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, read: true, read_at: item.read_at ?? nowIso }
            : item,
        ),
      )
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setInboxSavingId('')
    }
  }

  async function handleMarkAllInboxRead() {
    try {
      setInboxSavingId('all')
      await markAllClientNotificationsRead({ session })
      const nowIso = new Date().toISOString()
      setInboxItems((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: item.read_at ?? nowIso,
        })),
      )
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setInboxSavingId('')
    }
  }

  function openInbox() {
    setShowInbox(true)
    loadInbox()
  }

  async function applyRestaurantFilters(filters) {
    if (!ensureOnline('procurar restaurantes')) return
    try {
      setRestaurantsLoading(true)
      const next = await fetchRestaurants(session, filters)
      setRestaurants(next)
      if (next.length > 0 && !next.find((restaurant) => restaurant.id === restaurantId)) {
        setRestaurantId(next[0].id)
      }
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setRestaurantsLoading(false)
    }
  }

  async function loadOrdersHistory({ append = false } = {}) {
    if (!ensureOnline('carregar pedidos')) {
      return
    }

    try {
      setOrdersLoading(true)
      const targetPage = append ? ordersPage + 1 : 1
      const data = await fetchClientOrdersHistory({
        session,
        limit: ORDERS_PAGE_SIZE,
        page: targetPage,
      })
      if (append) {
        setOrdersHistory((current) => [...current, ...data])
      } else {
        setOrdersHistory(data)
      }
      setOrdersPage(targetPage)
      setHasMoreOrders(data.length === ORDERS_PAGE_SIZE)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setOrdersLoading(false)
    }
  }

  function openOrdersHistory() {
    setRoute('orders')
    setOrdersPage(1)
    setHasMoreOrders(true)
    loadOrdersHistory({ append: false })
  }

  function requestCancelOrder(order) {
    setCancelTargetOrder(order)
    setCancelReason('')
    setErrorText('')
  }

  async function confirmCancelOrder() {
    if (!cancelTargetOrder) return
    if (!ensureOnline('cancelar pedido')) return

    try {
      setIsCancellingOrder(true)
      await cancelClientOrderById({
        session,
        orderId: cancelTargetOrder.id,
        reason: cancelReason,
      })
      setSuccessText('Pedido cancelado.')
      setOrdersHistory((current) =>
        current.map((item) =>
          item.id === cancelTargetOrder.id ? { ...item, status: 'CANCELLED' } : item,
        ),
      )
      if (activeOrderId === cancelTargetOrder.id) {
        setActiveOrderId('')
      }
      setCancelTargetOrder(null)
      setCancelReason('')
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsCancellingOrder(false)
    }
  }

  async function openChatForCurrentOrder(targetType) {
    if (!activeOrderId) {
      setErrorText('Sem pedido ativo para iniciar chat.')
      return
    }
    if (!ensureOnline('abrir chat')) return

    try {
      setChatLoading(true)
      let existingChats = await fetchOrderChats({ session, orderId: activeOrderId })
      let target = existingChats.find((chat) => chat.type === targetType) ?? null

      if (!target) {
        const participantIds = [userId]
        if (targetType === 'CUSTOMER_RESTAURANT' && tracking?.order?.restaurant) {
          // O backend resolve internamente; passamos so o cliente como participante seguro
        }
        if (targetType === 'CUSTOMER_COURIER' && tracking?.courier_id) {
          participantIds.push(tracking.courier_id)
        }

        target = await createOrderChat({
          session,
          orderId: activeOrderId,
          type: targetType,
          participantUserIds: participantIds,
        })
      }

      setChatModalState({
        visible: true,
        chat: target,
        messages: target.messages ?? [],
        type: targetType,
        participants: target.participants ?? [],
      })
      setErrorText('')

      if (target.id) {
        markChatRead({ session, chatId: target.id }).catch(() => {})
      }
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setChatLoading(false)
    }
  }

  async function sendChatMessageFromModal() {
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
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
      setChatDraft(draft)
    } finally {
      setChatSending(false)
    }
  }

  function closeChatModal() {
    setChatModalState({
      visible: false,
      chat: null,
      messages: [],
      type: null,
      participants: [],
    })
    setChatDraft('')
  }

  async function loadMoreChatMessages() {
    if (!chatModalState.chat?.id) return
    try {
      const newLimit = chatModalState.messages.length + 50
      const older = await fetchChatMessages({
        session,
        chatId: chatModalState.chat.id,
        limit: newLimit,
      })
      setChatModalState((current) => ({
        ...current,
        messages: older,
      }))
    } catch (error) {
      setErrorText(error.message)
    }
  }

  function hasReviewFor(targetType, targetId) {
    return clientReviews.some(
      (review) =>
        String(review.target_type).toUpperCase() === String(targetType).toUpperCase() &&
        String(review.target_id) === String(targetId),
    )
  }

  function openReviewModal(order, targetType, targetId) {
    if (!order || !targetType || !targetId) return
    if (hasReviewFor(targetType, targetId)) {
      setErrorText('Ja avaliou este destinatario. Veja em "Minhas avaliacoes" para editar.')
      return
    }
    setReviewTarget({
      orderId: order.id,
      restaurantName: order.restaurant_name,
      targetType,
      targetId,
    })
    setReviewRating(5)
    setReviewComment('')
    setEditingReview(null)
    setErrorText('')
  }

  function openEditReview(review) {
    setEditingReview(review)
    setReviewTarget({
      orderId: null,
      restaurantName: null,
      targetType: review.target_type,
      targetId: review.target_id,
    })
    setReviewRating(Number(review.rating))
    setReviewComment(review.comment ?? '')
    setShowReviewsHistory(false)
  }

  async function submitReview() {
    if (!reviewTarget) return
    if (!ensureOnline('enviar avaliacao')) return

    try {
      setIsSubmittingReview(true)
      if (editingReview) {
        await updateClientReview({
          session,
          reviewId: editingReview.id,
          rating: reviewRating,
          comment: reviewComment,
        })
        setSuccessText('Avaliacao atualizada.')
      } else {
        await createClientReview({
          session,
          rating: reviewRating,
          comment: reviewComment,
          targetType: reviewTarget.targetType,
          targetId: reviewTarget.targetId,
        })
        setSuccessText('Avaliacao enviada. Obrigado!')
      }
      await refreshReviewsHistory()
      setErrorText('')
      setReviewTarget(null)
      setReviewRating(5)
      setReviewComment('')
      setEditingReview(null)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  async function refreshReviewsHistory() {
    try {
      const reviews = await fetchClientReviewsHistory({ session })
      setClientReviews(reviews)
    } catch {
      // ignore silently — review history is optional
    }
  }

  async function handleDeleteReview(review) {
    if (!ensureOnline('apagar avaliacao')) return
    try {
      await deleteClientReview({ session, reviewId: review.id })
      setClientReviews((current) => current.filter((item) => item.id !== review.id))
      setSuccessText('Avaliacao apagada.')
    } catch (error) {
      setErrorText(error.message)
    }
  }

  async function handleSaveProfile() {
    if (!ensureOnline('guardar perfil')) return

    try {
      setIsSavingProfile(true)
      const updated = await updateClientUser({
        session,
        name: profileDraft.name,
        email: profileDraft.email,
      })
      setSuccessText('Perfil atualizado.')
      setErrorText('')
      if (updated) {
        setProfileDraft({ name: updated.name ?? '', email: updated.email ?? '' })
      }
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function openOrderDetail(order) {
    if (!ensureOnline('carregar detalhe')) return
    setOrderDetailModal({ visible: true, order: null, loading: true })
    try {
      const detail = await fetchClientOrderDetail({ session, orderId: order.id })
      setOrderDetailModal({ visible: true, order: detail, loading: false })
    } catch (error) {
      setErrorText(error.message)
      setOrderDetailModal({ visible: false, order: null, loading: false })
    }
  }

  async function handleRepeatOrder(order) {
    if (!ensureOnline('repetir pedido')) return

    try {
      setBusyOrderId(order.id)
      const nextCart = await repeatClientOrderToCart({ session, orderId: order.id })
      setCart(nextCart)
      setSuccessText(`Itens de ${order.restaurant_name ?? 'pedido anterior'} adicionados ao carrinho.`)
      setErrorText('')
      setRoute('cart')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setBusyOrderId('')
    }
  }

  async function openRestaurant(id) {
    if (!ensureOnline('abrir restaurante')) {
      return
    }

    try {
      setLoading(true)
      setRestaurantId(id)
      const nextMenu = await fetchRestaurantMenu({ session, restaurantId: id })
      setMenuItems(nextMenu)
      setRoute('menu')
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function refreshCart() {
    if (!ensureOnline('atualizar carrinho')) {
      return
    }

    const nextCart = await fetchMyCart(session)
    setCart(nextCart)
  }

  async function addToCart(restaurantProductId, optionIds = [], quantity = 1) {
    if (!ensureOnline('adicionar ao carrinho')) {
      return
    }

    try {
      setLoading(true)
      const nextCart = await addCartItem({
        session,
        restaurantProductId,
        quantity: Math.max(1, quantity),
        optionIds,
      })
      setCart(nextCart)
      setSuccessText(`${quantity}x adicionado ao carrinho.`)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddProductWithOptions(menuItem) {
    if (!ensureOnline('adicionar ao carrinho')) return

    if (!menuItem.product_id) {
      await addToCart(menuItem.restaurant_product_id)
      return
    }

    try {
      setIsLoadingOptions(true)
      const groups = await fetchProductOptionGroups({
        session,
        productId: menuItem.product_id,
      })

      if (groups.length === 0) {
        await addToCart(menuItem.restaurant_product_id)
        return
      }

      const defaults = {}
      groups.forEach((group) => {
        defaults[group.id] = group.options.filter((option) => option.default_option).map((option) => option.id)
      })

      setOptionGroups(groups)
      setOptionSelections(defaults)
      setOptionsTargetProduct(menuItem)
      setOptionQuantity(1)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsLoadingOptions(false)
    }
  }

  function toggleOptionSelection(groupId, optionId, group) {
    setOptionSelections((current) => {
      const currentSelection = current[groupId] ?? []
      const isSelected = currentSelection.includes(optionId)
      let nextSelection

      if (isSelected) {
        nextSelection = currentSelection.filter((id) => id !== optionId)
      } else if (group.max_options <= 1) {
        nextSelection = [optionId]
      } else if (currentSelection.length >= group.max_options) {
        nextSelection = [...currentSelection.slice(1), optionId]
      } else {
        nextSelection = [...currentSelection, optionId]
      }

      return { ...current, [groupId]: nextSelection }
    })
  }

  async function confirmAddWithOptions() {
    const invalidGroup = optionGroups.find((group) => {
      const count = (optionSelections[group.id] ?? []).length
      return count < group.min_options || count > group.max_options
    })

    if (invalidGroup) {
      setErrorText(
        `Grupo "${invalidGroup.name}" requer entre ${invalidGroup.min_options} e ${invalidGroup.max_options} opcoes.`,
      )
      return
    }

    const allOptionIds = Object.values(optionSelections).flat()
    const target = optionsTargetProduct
    const qty = optionQuantity
    setOptionsTargetProduct(null)
    setOptionGroups([])
    setOptionSelections({})
    setOptionQuantity(1)

    if (target) {
      await addToCart(target.restaurant_product_id, allOptionIds, qty)
    }
  }

  async function decrease(cartItemId, quantity) {
    if (!ensureOnline('atualizar carrinho')) {
      return
    }

    try {
      setLoading(true)
      if (quantity <= 1) {
        const nextCart = await removeCartItem({ session, cartItemId })
        setCart(nextCart)
      } else {
        const nextCart = await updateCartItem({
          session,
          cartItemId,
          quantity: quantity - 1,
        })
        setCart(nextCart)
      }
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function increase(cartItemId, quantity) {
    if (!ensureOnline('atualizar carrinho')) {
      return
    }

    try {
      setLoading(true)
      const nextCart = await updateCartItem({
        session,
        cartItemId,
        quantity: quantity + 1,
      })
      setCart(nextCart)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function remove(cartItemId) {
    if (!ensureOnline('remover item do carrinho')) {
      return
    }

    try {
      setLoading(true)
      const nextCart = await removeCartItem({ session, cartItemId })
      setCart(nextCart)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function placeOrder() {
    if (!ensureOnline('finalizar checkout')) {
      return
    }

    if (!selectedAddressId) {
      setErrorText('Escolhe uma morada de entrega antes do checkout.')
      return
    }

    try {
      setLoading(true)
      const result = await checkoutCart(session, {
        addressId: selectedAddressId,
        paymentMethod,
        couponCode: couponCode || null,
      })
      setLastCheckout(result)
      setActiveOrderId(result.order_id)
      setErrorText('')
      setCouponCode('')
      await refreshCart()

      if (result.payment_status === 'PENDING' && result.payment_id) {
        setPendingPayment({
          paymentId: result.payment_id,
          orderId: result.order_id,
          method: result.payment_method,
          total: result.total,
          createdAtMs: Date.now(),
        })
        setSuccessText('Pedido criado. Falta confirmar o pagamento.')
      } else {
        setRoute('tracking')
        setSuccessText('Pedido criado com sucesso.')
        await loadTracking(result.order_id)
      }
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePayPendingPayment() {
    if (!pendingPayment) return
    if (!ensureOnline('confirmar pagamento')) return

    try {
      setIsPayingNow(true)
      const payment = await payPaymentNow({
        session,
        paymentId: pendingPayment.paymentId,
      })
      setSuccessText('Pagamento confirmado.')
      setErrorText('')
      setPendingPayment(null)
      setRoute('tracking')
      await loadTracking(pendingPayment.orderId)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setIsPayingNow(false)
    }
  }

  async function refreshPendingPaymentStatus() {
    if (!pendingPayment) return
    try {
      const payment = await fetchOrderPayment({
        session,
        orderId: pendingPayment.orderId,
      })
      if (payment?.status === 'COMPLETED') {
        setPendingPayment(null)
        setSuccessText('Pagamento confirmado externamente.')
        setRoute('tracking')
        await loadTracking(pendingPayment.orderId)
      } else if (payment?.status === 'FAILED') {
        setPendingPayment(null)
        setErrorText('Pagamento expirou ou falhou.')
      }
    } catch {
      // ignore polling errors silently
    }
  }

  async function loadTracking(orderId) {
    if (!ensureOnline('carregar tracking')) {
      return
    }

    try {
      const nextTracking = await fetchOrderTracking({
        session,
        orderId,
      })
      setTracking(nextTracking)
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    }
  }

  function back() {
    setSuccessText('')

    if (route === 'menu') {
      setRoute('home')
      return
    }

    if (route === 'cart') {
      setRoute('menu')
      return
    }

    if (route === 'tracking') {
      setRoute('home')
      return
    }

    if (route === 'orders') {
      setRoute('home')
      return
    }

    if (route === 'profile') {
      setRoute('home')
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {route === 'home' && (
        <HomeScreen
          restaurants={restaurants}
          loading={loading || restaurantsLoading}
          isOnline={isOnline}
          pushStatus={pushStatus}
          notificationState={notificationState}
          notificationPreview={notificationPreview}
          onOpenRestaurant={openRestaurant}
          onOpenTracking={() => {
            if (activeOrderId) {
              setRoute('tracking')
              loadTracking(activeOrderId)
            }
          }}
          hasActiveOrder={Boolean(activeOrderId)}
          onOpenProfile={() => setRoute('profile')}
          inboxUnreadCount={inboxUnreadCount}
          onOpenInbox={openInbox}
          onOpenOrders={openOrdersHistory}
          filters={restaurantFilters}
          onChangeFilters={setRestaurantFilters}
          onApplyFilters={() => applyRestaurantFilters(restaurantFilters)}
          onResetFilters={() => {
            setRestaurantFilters({ q: '', city: '', postalCode: '' })
            applyRestaurantFilters({})
          }}
        />
      )}
      {route === 'profile' && (
        <ProfileScreen
          session={session}
          profileDraft={profileDraft}
          onChangeDraft={setProfileDraft}
          isSavingProfile={isSavingProfile}
          onSave={handleSaveProfile}
          onBack={back}
          onLogoutRequest={() => setShowLogoutConfirm(true)}
          addresses={addresses}
          onOpenAddresses={() => setShowAddressModal(true)}
          onOpenReviewsHistory={() => {
            setShowReviewsHistory(true)
            refreshReviewsHistory()
          }}
          reviewsCount={clientReviews.length}
        />
      )}
      {route === 'orders' && (
        <OrdersHistoryScreen
          orders={ordersHistory}
          loading={ordersLoading}
          busyOrderId={busyOrderId}
          onBack={back}
          onRefresh={() => loadOrdersHistory({ append: false })}
          onCancel={requestCancelOrder}
          onRepeat={handleRepeatOrder}
          onTrack={(order) => {
            setActiveOrderId(order.id)
            setRoute('tracking')
            loadTracking(order.id)
          }}
          onReview={openReviewModal}
          onOpenDetail={openOrderDetail}
          onLoadMore={() => loadOrdersHistory({ append: true })}
          hasMore={hasMoreOrders}
        />
      )}
      {route === 'menu' && (
        <MenuScreen
          restaurant={restaurant}
          items={menuItems}
          itemCount={itemCount}
          total={total}
          loading={loading || isLoadingOptions}
          onBack={back}
          onAdd={handleAddProductWithOptions}
          onOpenCart={() => setRoute('cart')}
          activeCategory={menuCategory}
          onChangeCategory={setMenuCategory}
        />
      )}
      {route === 'cart' && (
        <CartScreen
          items={cartItems}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          total={total}
          loading={loading}
          onDecrease={decrease}
          onIncrease={increase}
          onRemove={remove}
          onPlaceOrder={placeOrder}
          selectedAddress={selectedAddress}
          paymentMethod={paymentMethod}
          couponCode={couponCode}
          onChangeCouponCode={setCouponCode}
          onOpenAddressPicker={() => setShowAddressModal(true)}
          onOpenPaymentPicker={() => setShowPaymentModal(true)}
        />
      )}
      {route === 'tracking' && (
        <TrackingScreen
          tracking={tracking}
          checkout={lastCheckout}
          realtimeState={realtimeState}
          isOnline={isOnline}
          onBack={back}
          onRefresh={() => activeOrderId && loadTracking(activeOrderId)}
          onOpenChatRestaurant={() => openChatForCurrentOrder('CUSTOMER_RESTAURANT')}
          onOpenChatCourier={() => openChatForCurrentOrder('CUSTOMER_COURIER')}
          chatLoading={chatLoading}
        />
      )}

      {successText ? <Text style={styles.successText}>{ICON.check} {successText}</Text> : null}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

      <Modal
        visible={Boolean(reviewTarget)}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isSubmittingReview) setReviewTarget(null)
        }}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.failModalCardClient}>
            <Text style={styles.inboxTitle}>
              Avaliar {reviewTarget?.targetType === 'COURIER' ? 'estafeta' : 'restaurante'}
            </Text>
            <Text style={styles.inboxSubtitle}>
              {reviewTarget?.restaurantName
                ? `Pedido em ${reviewTarget.restaurantName}`
                : 'Partilha a tua experiencia'}
            </Text>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => setReviewRating(star)}
                  style={styles.starButton}
                  disabled={isSubmittingReview}
                >
                  <Text
                    style={[
                      styles.starText,
                      reviewRating >= star ? styles.starTextActive : null,
                    ]}
                  >
                    {ICON.star}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>{reviewRating} / 5</Text>

            <Text style={styles.checkoutRowLabel}>Comentario (opcional)</Text>
            <TextInput
              style={[styles.couponInput, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="Conta como correu..."
              placeholderTextColor="#94a3b8"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              editable={!isSubmittingReview}
            />

            <View style={styles.cancelActionsRow}>
              <Pressable
                style={styles.cancelSecondary}
                onPress={() => {
                  if (!isSubmittingReview) setReviewTarget(null)
                }}
                disabled={isSubmittingReview}
              >
                <Text style={styles.cancelSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.cancelDanger, { backgroundColor: '#0b9b3f' }]}
                onPress={submitReview}
                disabled={isSubmittingReview}
              >
                <Text style={styles.cancelDangerText}>
                  {isSubmittingReview ? 'A enviar...' : 'Enviar avaliacao'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={orderDetailModal.visible}
        animationType="slide"
        transparent
        onRequestClose={() => setOrderDetailModal({ visible: false, order: null, loading: false })}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.inboxCard}>
            <View style={styles.inboxHeader}>
              <View>
                <Text style={styles.inboxTitle}>Detalhe do pedido</Text>
                <Text style={styles.inboxSubtitle}>
                  {orderDetailModal.order
                    ? `#${String(orderDetailModal.order.id).slice(0, 8)}`
                    : 'A carregar...'}
                </Text>
              </View>
              <Pressable
                style={styles.inboxClose}
                onPress={() => setOrderDetailModal({ visible: false, order: null, loading: false })}
              >
                <Text style={styles.inboxCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.inboxList} contentContainerStyle={styles.inboxListContent}>
              {orderDetailModal.loading ? (
                <Text style={styles.mutedText}>A carregar...</Text>
              ) : null}
              {orderDetailModal.order ? (
                <>
                  <SummaryLine
                    label="Estado"
                    value={statusLabel(orderDetailModal.order.status)}
                  />
                  <SummaryLine
                    label="Restaurante"
                    value={orderDetailModal.order.restaurant_name_snapshot ?? '-'}
                  />
                  <SummaryLine
                    label="Total"
                    value={`EUR ${Number(orderDetailModal.order.total ?? 0).toFixed(2)}`}
                  />
                  <SummaryLine
                    label="Pagamento"
                    value={`${orderDetailModal.order.payment?.method ?? '-'} (${
                      orderDetailModal.order.payment?.status ?? '-'
                    })`}
                  />
                  <SummaryLine
                    label="Criado em"
                    value={
                      orderDetailModal.order.created_at
                        ? new Date(orderDetailModal.order.created_at).toLocaleString()
                        : '-'
                    }
                  />
                  {orderDetailModal.order.address ? (
                    <SummaryLine
                      label="Morada"
                      value={`${orderDetailModal.order.address.street}, ${orderDetailModal.order.address.city}`}
                    />
                  ) : null}

                  <Text style={[styles.checkoutSectionTitle, { marginTop: 16 }]}>Itens</Text>
                  {(orderDetailModal.order.items ?? []).map((item) => (
                    <View key={item.id} style={styles.checkoutRow}>
                      <View style={styles.checkoutRowText}>
                        <Text style={styles.checkoutRowValue}>
                          {item.quantity}x {item.product_name_snapshot}
                        </Text>
                        {(item.options ?? []).map((option) => (
                          <Text style={styles.checkoutRowLabel} key={option.id}>
                            + {option.option_name_snapshot}
                            {Number(option.extra_price) > 0
                              ? ` (${Number(option.extra_price).toFixed(2)} EUR)`
                              : ''}
                          </Text>
                        ))}
                      </View>
                      <Text style={styles.checkoutRowValue}>
                        {Number(item.total_price ?? 0).toFixed(2)} EUR
                      </Text>
                    </View>
                  ))}

                  {(orderDetailModal.order.discounts ?? []).length > 0 ? (
                    <>
                      <Text style={[styles.checkoutSectionTitle, { marginTop: 16 }]}>
                        Descontos
                      </Text>
                      {orderDetailModal.order.discounts.map((discount) => (
                        <SummaryLine
                          key={discount.id}
                          label={discount.name_snapshot}
                          value={`-${Number(discount.discount_amount ?? 0).toFixed(2)} EUR`}
                        />
                      ))}
                    </>
                  ) : null}

                  <Text style={[styles.checkoutSectionTitle, { marginTop: 16 }]}>Timeline</Text>
                  {(orderDetailModal.order.events ?? []).map((event, index) => (
                    <SummaryLine
                      key={`${event.event_type}-${index}`}
                      label={String(event.event_type ?? '').replaceAll('_', ' ')}
                      value={
                        event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '-'
                      }
                    />
                  ))}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReviewsHistory}
        animationType="slide"
        transparent
        onRequestClose={() => setShowReviewsHistory(false)}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.inboxCard}>
            <View style={styles.inboxHeader}>
              <View>
                <Text style={styles.inboxTitle}>Minhas avaliacoes</Text>
                <Text style={styles.inboxSubtitle}>
                  Editar ou apagar avaliacoes anteriores
                </Text>
              </View>
              <Pressable
                style={styles.inboxClose}
                onPress={() => setShowReviewsHistory(false)}
              >
                <Text style={styles.inboxCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.inboxList} contentContainerStyle={styles.inboxListContent}>
              {clientReviews.length === 0 ? (
                <Text style={styles.inboxEmpty}>Sem avaliacoes ainda.</Text>
              ) : null}
              {clientReviews.map((review) => (
                <View key={review.id} style={styles.inboxItem}>
                  <View style={styles.inboxItemTop}>
                    <Text style={styles.inboxItemTitle}>
                      {review.target_type} · {Number(review.rating)}★
                    </Text>
                    <Text style={styles.inboxItemTimestamp}>
                      {review.created_at
                        ? new Date(review.created_at).toLocaleDateString()
                        : '-'}
                    </Text>
                  </View>
                  <Text style={styles.inboxItemMessage}>{review.comment || 'Sem comentario.'}</Text>
                  <View style={styles.inboxItemFooter}>
                    <Pressable onPress={() => openEditReview(review)}>
                      <Text style={styles.inboxItemAction}>Editar</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteReview(review)}>
                      <Text style={[styles.inboxItemAction, { color: '#b91c1c' }]}>Apagar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLogoutConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.failModalCardClient}>
            <Text style={styles.inboxTitle}>Terminar sessao?</Text>
            <Text style={styles.inboxSubtitle}>
              Vais sair da conta. Tera de fazer login outra vez.
            </Text>

            <View style={styles.cancelActionsRow}>
              <Pressable
                style={styles.cancelSecondary}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.cancelSecondaryText}>Voltar</Text>
              </Pressable>
              <Pressable
                style={styles.cancelDanger}
                onPress={() => {
                  setShowLogoutConfirm(false)
                  onLogout()
                }}
              >
                <Text style={styles.cancelDangerText}>Sair</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={chatModalState.visible}
        animationType="slide"
        transparent
        onRequestClose={closeChatModal}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.inboxCard}>
            <View style={styles.inboxHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inboxTitle}>
                  Chat com {chatModalState.type === 'CUSTOMER_COURIER' ? 'estafeta' : 'restaurante'}
                </Text>
                <Text style={styles.inboxSubtitle}>
                  {chatModalState.chat?.id
                    ? `Chat #${String(chatModalState.chat.id).slice(0, 8)}`
                    : 'Carregando'}
                </Text>
              </View>
              <Pressable style={styles.inboxClose} onPress={closeChatModal}>
                <Text style={styles.inboxCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.inboxList} contentContainerStyle={styles.inboxListContent}>
              {chatModalState.messages.length === 0 ? (
                <Text style={styles.inboxEmpty}>Sem mensagens ainda.</Text>
              ) : null}
              {chatModalState.messages.length >= 50 ? (
                <Pressable
                  style={[styles.addressAddBtn, { marginBottom: 8 }]}
                  onPress={loadMoreChatMessages}
                >
                  <Text style={styles.addressAddBtnText}>Carregar mensagens antigas</Text>
                </Pressable>
              ) : null}
              {chatModalState.messages.map((message) => {
                const isMine = message.sender_participant_id === userId
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.chatBubble,
                      isMine ? styles.chatBubbleMine : styles.chatBubbleOther,
                    ]}
                  >
                    <Text style={styles.chatBubbleText}>{message.content}</Text>
                    <Text style={styles.chatBubbleTime}>
                      {message.timestamp
                        ? new Date(message.timestamp).toLocaleTimeString()
                        : ''}
                      {isMine && message.read_at ? ' ✓✓' : isMine ? ' ✓' : ''}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>

            <View style={styles.chatComposeRow}>
              <TextInput
                style={styles.chatInput}
                value={chatDraft}
                onChangeText={setChatDraft}
                placeholder="Escreve uma mensagem..."
                placeholderTextColor="#94a3b8"
                editable={!chatSending}
                multiline
              />
              <Pressable
                style={styles.chatSendBtn}
                onPress={sendChatMessageFromModal}
                disabled={chatSending || chatDraft.trim() === ''}
              >
                <Text style={styles.chatSendBtnText}>
                  {chatSending ? '...' : 'Enviar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(pendingPayment)}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isPayingNow) {
            setPendingPayment(null)
          }
        }}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.failModalCardClient}>
            <Text style={styles.inboxTitle}>Pagamento pendente</Text>
            <Text style={styles.inboxSubtitle}>
              Confirma o pagamento {paymentMethodLabel(pendingPayment?.method ?? 'CARD')} no portal externo.
              Apos confirmacao, o pedido fica em CONFIRMED.
            </Text>

            <View style={styles.paymentCountdown}>
              <Text style={styles.paymentCountdownLabel}>Tempo restante</Text>
              <Text
                style={[
                  styles.paymentCountdownValue,
                  paymentRemainingSeconds !== null && paymentRemainingSeconds <= 60
                    ? styles.paymentCountdownDanger
                    : null,
                ]}
              >
                {paymentRemainingSeconds === null
                  ? '--:--'
                  : `${String(Math.floor(paymentRemainingSeconds / 60)).padStart(2, '0')}:${String(
                      paymentRemainingSeconds % 60,
                    ).padStart(2, '0')}`}
              </Text>
            </View>

            <View style={styles.confirmSummary}>
              <SummaryLine
                label="Total"
                value={`EUR ${Number(pendingPayment?.total ?? 0).toFixed(2)}`}
              />
              <SummaryLine label="Metodo" value={paymentMethodLabel(pendingPayment?.method ?? 'CARD')} />
            </View>

            <View style={styles.cancelActionsRow}>
              <Pressable
                style={styles.cancelSecondary}
                onPress={() => {
                  if (!isPayingNow) setPendingPayment(null)
                }}
                disabled={isPayingNow}
              >
                <Text style={styles.cancelSecondaryText}>Fechar</Text>
              </Pressable>
              <Pressable
                style={[styles.cancelDanger, { backgroundColor: '#0b9b3f' }]}
                onPress={handlePayPendingPayment}
                disabled={isPayingNow}
              >
                <Text style={styles.cancelDangerText}>
                  {isPayingNow ? 'A confirmar...' : 'Simular pagamento'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(optionsTargetProduct)}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!loading) {
            setOptionsTargetProduct(null)
            setOptionGroups([])
            setOptionSelections({})
          }
        }}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.inboxCard}>
            <View style={styles.inboxHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inboxTitle}>{optionsTargetProduct?.name ?? 'Configurar'}</Text>
                <Text style={styles.inboxSubtitle}>
                  Escolhe as opcoes obrigatorias antes de adicionar
                </Text>
              </View>
              <Pressable
                style={styles.inboxClose}
                onPress={() => {
                  setOptionsTargetProduct(null)
                  setOptionGroups([])
                  setOptionSelections({})
                }}
              >
                <Text style={styles.inboxCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.inboxList} contentContainerStyle={styles.inboxListContent}>
              {optionGroups.map((group) => {
                const selection = optionSelections[group.id] ?? []
                return (
                  <View key={group.id} style={styles.optionGroupCard}>
                    <View style={styles.optionGroupHeader}>
                      <Text style={styles.optionGroupName}>{group.name}</Text>
                      <Text style={styles.optionGroupRule}>
                        {group.min_options === group.max_options
                          ? `Escolhe ${group.max_options}`
                          : `Escolhe ${group.min_options}-${group.max_options}`}
                      </Text>
                    </View>
                    {group.options.map((option) => {
                      const checked = selection.includes(option.id)
                      return (
                        <Pressable
                          key={option.id}
                          style={[
                            styles.optionRow,
                            checked ? styles.optionRowChecked : null,
                          ]}
                          onPress={() => toggleOptionSelection(group.id, option.id, group)}
                        >
                          <Text
                            style={[
                              styles.optionRowText,
                              checked ? styles.optionRowTextChecked : null,
                            ]}
                          >
                            {checked ? '[x] ' : '[ ] '}
                            {option.name}
                          </Text>
                          {option.extra_price > 0 ? (
                            <Text style={styles.optionRowPrice}>
                              + {option.extra_price.toFixed(2)} EUR
                            </Text>
                          ) : null}
                        </Pressable>
                      )
                    })}
                  </View>
                )
              })}
            </ScrollView>

            <View style={styles.optionQuantityRow}>
              <Text style={styles.checkoutRowLabel}>Quantidade</Text>
              <View style={styles.qtyControl}>
                <Pressable
                  style={styles.qtyButton}
                  onPress={() => setOptionQuantity((q) => Math.max(1, q - 1))}
                >
                  <Text style={styles.qtyText}>{ICON.minus}</Text>
                </Pressable>
                <Text style={styles.qtyValue}>{optionQuantity}</Text>
                <Pressable
                  style={styles.qtyButton}
                  onPress={() => setOptionQuantity((q) => q + 1)}
                >
                  <Text style={styles.qtyText}>{ICON.plus}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.cancelActionsRow}>
              <Pressable
                style={styles.cancelSecondary}
                onPress={() => {
                  setOptionsTargetProduct(null)
                  setOptionGroups([])
                  setOptionSelections({})
                  setOptionQuantity(1)
                }}
                disabled={loading}
              >
                <Text style={styles.cancelSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.cancelDanger, { backgroundColor: '#3479ed' }]}
                onPress={confirmAddWithOptions}
                disabled={loading}
              >
                <Text style={styles.cancelDangerText}>
                  {loading ? 'A adicionar...' : `Adicionar ${optionQuantity}x ao carrinho`}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.inboxCard}>
            <View style={styles.inboxHeader}>
              <View>
                <Text style={styles.inboxTitle}>Moradas de entrega</Text>
                <Text style={styles.inboxSubtitle}>
                  Escolhe ou cria uma morada para receber a encomenda
                </Text>
              </View>
              <Pressable style={styles.inboxClose} onPress={() => setShowAddressModal(false)}>
                <Text style={styles.inboxCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.inboxList} contentContainerStyle={styles.inboxListContent}>
              {addresses.length === 0 ? (
                <Text style={styles.inboxEmpty}>Sem moradas. Cria uma abaixo.</Text>
              ) : null}

              {addresses.map((address) => {
                const isSelected = selectedAddressId === address.id
                return (
                  <View
                    key={address.id}
                    style={[
                      styles.addressOption,
                      isSelected ? styles.addressOptionSelected : null,
                    ]}
                  >
                    <Pressable
                      style={styles.addressOptionMain}
                      onPress={() => {
                        setSelectedAddressId(address.id)
                        setShowAddressModal(false)
                      }}
                    >
                      <Text style={styles.addressOptionLabel}>
                        {address.label || 'Morada'} {address.is_default ? '· default' : ''}
                      </Text>
                      <Text style={styles.addressOptionDetail}>
                        {address.street}, {address.city}
                      </Text>
                      <Text style={styles.addressOptionDetail}>
                        {address.postal_code} - {address.country}
                      </Text>
                    </Pressable>
                    <View style={styles.addressOptionActions}>
                      {!address.is_default ? (
                        <Pressable
                          style={styles.addressSetDefault}
                          onPress={() => handleSetDefaultAddress(address.id)}
                        >
                          <Text style={styles.addressSetDefaultText}>Default</Text>
                        </Pressable>
                      ) : null}
                      <Pressable
                        style={styles.addressSetDefault}
                        onPress={() => startEditAddress(address)}
                      >
                        <Text style={styles.addressSetDefaultText}>Editar</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.addressSetDefault, styles.addressDeleteBtn]}
                        onPress={() => setDeleteAddressTarget(address)}
                      >
                        <Text style={styles.addressDeleteText}>Apagar</Text>
                      </Pressable>
                    </View>
                  </View>
                )
              })}

              {showAddressForm ? (
                <View style={styles.addressForm}>
                  <Text style={styles.checkoutSectionTitle}>Nova morada</Text>
                  {[
                    { key: 'label', placeholder: 'Etiqueta (Casa, Trabalho)' },
                    { key: 'street', placeholder: 'Rua *' },
                    { key: 'city', placeholder: 'Cidade *' },
                    { key: 'postal_code', placeholder: 'Codigo postal *' },
                    { key: 'country', placeholder: 'Pais *' },
                    { key: 'latitude', placeholder: 'Latitude (ex: 41.1579)' },
                    { key: 'longitude', placeholder: 'Longitude (ex: -8.6291)' },
                  ].map((field) => (
                    <TextInput
                      key={field.key}
                      style={styles.couponInput}
                      placeholder={field.placeholder}
                      placeholderTextColor="#94a3b8"
                      value={String(addressDraft[field.key] ?? '')}
                      onChangeText={(text) =>
                        setAddressDraft((current) => ({ ...current, [field.key]: text }))
                      }
                      keyboardType={
                        field.key === 'latitude' || field.key === 'longitude' ? 'numeric' : 'default'
                      }
                    />
                  ))}
                  <Pressable
                    style={styles.addressDefaultToggle}
                    onPress={() =>
                      setAddressDraft((current) => ({
                        ...current,
                        is_default: !current.is_default,
                      }))
                    }
                  >
                    <Text style={styles.addressDefaultToggleText}>
                      {addressDraft.is_default ? '[x] Marcar como default' : '[ ] Marcar como default'}
                    </Text>
                  </Pressable>
                  <View style={styles.cancelActionsRow}>
                    <Pressable
                      style={styles.cancelSecondary}
                      onPress={() => setShowAddressForm(false)}
                      disabled={isSavingAddress}
                    >
                      <Text style={styles.cancelSecondaryText}>Voltar</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.cancelDanger, { backgroundColor: '#3479ed' }]}
                      onPress={handleCreateAddress}
                      disabled={isSavingAddress}
                    >
                      <Text style={styles.cancelDangerText}>
                        {isSavingAddress ? 'A guardar...' : 'Criar morada'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.addressAddBtn}
                  onPress={() => setShowAddressForm(true)}
                >
                  <Text style={styles.addressAddBtnText}>+ Adicionar nova morada</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(deleteAddressTarget)}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isSavingAddress) setDeleteAddressTarget(null)
        }}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.failModalCardClient}>
            <Text style={styles.inboxTitle}>Apagar morada</Text>
            <Text style={styles.inboxSubtitle}>
              Tem a certeza que quer apagar a morada{' '}
              {deleteAddressTarget?.label ?? deleteAddressTarget?.street}?
            </Text>
            <View style={styles.cancelActionsRow}>
              <Pressable
                style={styles.cancelSecondary}
                onPress={() => {
                  if (!isSavingAddress) setDeleteAddressTarget(null)
                }}
                disabled={isSavingAddress}
              >
                <Text style={styles.cancelSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={styles.cancelDanger}
                onPress={confirmDeleteAddress}
                disabled={isSavingAddress}
              >
                <Text style={styles.cancelDangerText}>
                  {isSavingAddress ? 'A apagar...' : 'Apagar'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.failModalCardClient}>
            <View style={styles.inboxHeader}>
              <Text style={styles.inboxTitle}>Metodo de pagamento</Text>
              <Pressable style={styles.inboxClose} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.inboxCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            {['CASH', 'CARD', 'MBWAY', 'PAYPAL'].map((method) => (
              <Pressable
                key={method}
                style={[
                  styles.paymentOption,
                  paymentMethod === method ? styles.paymentOptionSelected : null,
                ]}
                onPress={() => {
                  setPaymentMethod(method)
                  setShowPaymentModal(false)
                }}
              >
                <Text
                  style={[
                    styles.paymentOptionText,
                    paymentMethod === method ? styles.paymentOptionTextSelected : null,
                  ]}
                >
                  {paymentMethodLabel(method)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(cancelTargetOrder)}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!isCancellingOrder) {
            setCancelTargetOrder(null)
          }
        }}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.cancelOrderCard}>
            <Text style={styles.inboxTitle}>Cancelar pedido</Text>
            <Text style={styles.inboxSubtitle}>
              Esta acao notifica o restaurante e termina o pedido. Indica o motivo (opcional).
            </Text>

            {cancelTargetOrder ? (
              <View style={styles.cancelSummaryRow}>
                <Text style={styles.cancelSummaryLabel}>
                  {cancelTargetOrder.restaurant_name ?? '-'} - EUR{' '}
                  {Number(cancelTargetOrder.total ?? 0).toFixed(2)}
                </Text>
              </View>
            ) : null}

            <Text style={styles.cancelInputLabel}>Motivo (opcional)</Text>
            <TextInput
              style={styles.cancelInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              editable={!isCancellingOrder}
              placeholder="Ex: enganei-me na morada"
              placeholderTextColor="#94a3b8"
              multiline
            />

            <View style={styles.cancelActionsRow}>
              <Pressable
                style={styles.cancelSecondary}
                onPress={() => {
                  if (!isCancellingOrder) {
                    setCancelTargetOrder(null)
                    setCancelReason('')
                  }
                }}
                disabled={isCancellingOrder}
              >
                <Text style={styles.cancelSecondaryText}>Voltar</Text>
              </Pressable>
              <Pressable
                style={styles.cancelDanger}
                onPress={confirmCancelOrder}
                disabled={isCancellingOrder}
              >
                <Text style={styles.cancelDangerText}>
                  {isCancellingOrder ? 'A cancelar...' : 'Cancelar pedido'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showInbox}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInbox(false)}
      >
        <View style={styles.inboxBackdrop}>
          <View style={styles.inboxCard}>
            <View style={styles.inboxHeader}>
              <View>
                <Text style={styles.inboxTitle}>Notificacoes</Text>
                <Text style={styles.inboxSubtitle}>
                  {inboxUnreadCount > 0
                    ? `${inboxUnreadCount} nao lidas`
                    : 'Todas as notificacoes lidas'}
                </Text>
              </View>
              <Pressable style={styles.inboxClose} onPress={() => setShowInbox(false)}>
                <Text style={styles.inboxCloseText}>{'×'}</Text>
              </Pressable>
            </View>

            <View style={styles.inboxActions}>
              <Pressable
                style={[
                  styles.inboxFilter,
                  inboxUnreadOnly ? styles.inboxFilterActive : null,
                ]}
                onPress={() => setInboxUnreadOnly((current) => !current)}
              >
                <Text
                  style={[
                    styles.inboxFilterText,
                    inboxUnreadOnly ? styles.inboxFilterTextActive : null,
                  ]}
                >
                  {inboxUnreadOnly ? 'Mostrar todas' : 'So nao lidas'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.inboxFilter}
                onPress={loadInbox}
                disabled={inboxLoading}
              >
                <Text style={styles.inboxFilterText}>
                  {inboxLoading ? 'A carregar...' : 'Atualizar'}
                </Text>
              </Pressable>
              <Pressable
                style={styles.inboxFilter}
                onPress={handleMarkAllInboxRead}
                disabled={inboxUnreadCount === 0 || inboxSavingId === 'all'}
              >
                <Text style={styles.inboxFilterText}>
                  {inboxSavingId === 'all' ? 'A marcar...' : 'Marcar tudo lido'}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.inboxList}
              contentContainerStyle={styles.inboxListContent}
            >
              {(() => {
                const visible = inboxUnreadOnly
                  ? inboxItems.filter((item) => !item.read)
                  : inboxItems

                if (!inboxLoading && visible.length === 0) {
                  return <Text style={styles.inboxEmpty}>Sem notificacoes para mostrar.</Text>
                }

                return visible.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.inboxItem,
                      item.read ? styles.inboxItemRead : styles.inboxItemUnread,
                    ]}
                  >
                    <View style={styles.inboxItemTop}>
                      <Text style={styles.inboxItemTitle}>{item.title}</Text>
                      <Text
                        style={[
                          styles.inboxItemBadge,
                          item.read ? styles.inboxItemBadgeRead : styles.inboxItemBadgeUnread,
                        ]}
                      >
                        {item.type}
                      </Text>
                    </View>
                    <Text style={styles.inboxItemMessage}>{item.message}</Text>
                    <View style={styles.inboxItemFooter}>
                      <Text style={styles.inboxItemTimestamp}>
                        {item.sent_at
                          ? new Date(item.sent_at).toLocaleString()
                          : '-'}
                      </Text>
                      {!item.read ? (
                        <Pressable
                          onPress={() => handleMarkInboxItemRead(item.id)}
                          disabled={inboxSavingId === item.id}
                        >
                          <Text style={styles.inboxItemAction}>
                            {inboxSavingId === item.id ? 'A marcar...' : 'Marcar lida'}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.inboxItemReadLabel}>Lida</Text>
                      )}
                    </View>
                  </View>
                ))
              })()}

              {inboxItems.length >= INBOX_MAX_ITEMS ? (
                <Pressable
                  style={[styles.addressAddBtn, { marginTop: 8 }]}
                  onPress={loadMoreInbox}
                  disabled={inboxLoading}
                >
                  <Text style={styles.addressAddBtnText}>
                    {inboxLoading ? 'A carregar...' : 'Carregar mais notificacoes'}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function HomeScreen({
  restaurants,
  loading,
  isOnline,
  pushStatus,
  notificationState,
  notificationPreview,
  onOpenRestaurant,
  onOpenTracking,
  hasActiveOrder,
  onOpenProfile,
  inboxUnreadCount,
  onOpenInbox,
  onOpenOrders,
  filters,
  onChangeFilters,
  onApplyFilters,
  onResetFilters,
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderTop}>
          <View>
            <Text style={styles.brand}>FastBite</Text>
            <Text style={styles.subtitle}>O que deseja comer hoje?</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.bellButton} onPress={onOpenInbox}>
              <Text style={styles.bellIcon}>{ICON.bell}</Text>
              {inboxUnreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
            <Pressable style={styles.profileButton} onPress={onOpenProfile}>
              <Text style={styles.profileIcon}>{ICON.user}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.searchField}>
          <Text style={styles.searchIcon}>{ICON.search}</Text>
          <TextInput
            style={styles.searchInput}
            value={filters?.q ?? ''}
            placeholder="Procurar restaurantes..."
            placeholderTextColor="#dbe7ff"
            onChangeText={(text) =>
              onChangeFilters?.((current) => ({ ...current, q: text }))
            }
            onSubmitEditing={onApplyFilters}
            returnKeyType="search"
          />
        </View>

        <View style={styles.filterRow}>
          <TextInput
            style={styles.filterInput}
            value={filters?.city ?? ''}
            placeholder="Cidade"
            placeholderTextColor="#dbe7ff"
            onChangeText={(text) =>
              onChangeFilters?.((current) => ({ ...current, city: text }))
            }
          />
          <TextInput
            style={styles.filterInput}
            value={filters?.postalCode ?? ''}
            placeholder="Cod. postal"
            placeholderTextColor="#dbe7ff"
            onChangeText={(text) =>
              onChangeFilters?.((current) => ({ ...current, postalCode: text }))
            }
          />
          <Pressable style={styles.filterApply} onPress={onApplyFilters}>
            <Text style={styles.filterApplyText}>Filtrar</Text>
          </Pressable>
          <Pressable style={styles.filterReset} onPress={onResetFilters}>
            <Text style={styles.filterResetText}>Limpar</Text>
          </Pressable>
        </View>

        {pushStatus && pushStatus !== 'idle' ? (
          <View style={styles.pushBanner}>
            <Text style={styles.pushBannerText}>
              Push: {pushStatus === 'registered'
                ? 'ativo'
                : pushStatus === 'permission_denied'
                  ? 'permissao negada'
                  : 'indisponivel'}
            </Text>
          </View>
        ) : null}

        {!isOnline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>Sem internet. A app entrou em modo offline.</Text>
          </View>
        ) : null}

        {notificationPreview ? (
          <Pressable style={styles.notificationBanner} onPress={onOpenInbox}>
            <Text style={styles.notificationBannerTitle}>
              {ICON.bell} {notificationPreview.title}
            </Text>
            <Text style={styles.notificationBannerText}>
              {notificationPreview.message} · toca para abrir inbox
            </Text>
          </Pressable>
        ) : null}

        {hasActiveOrder ? (
          <Pressable style={styles.activeOrderBtn} onPress={onOpenTracking}>
            <Text style={styles.activeOrderBtnText}>
              Ver pedido ativo ({notificationState === 'live' ? 'notif live' : notificationState})
            </Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.ordersLink} onPress={onOpenOrders}>
          <Text style={styles.ordersLinkText}>Meus pedidos</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(loading)}
            onRefresh={onApplyFilters}
            tintColor="#3479ed"
          />
        }
      >
        <Text style={styles.sectionTitle}>Restaurantes</Text>
        {loading && restaurants.length === 0 ? <Text style={styles.mutedText}>A carregar...</Text> : null}
        {restaurants.map((item) => (
          <Pressable
            key={item.id}
            style={styles.restaurantCard}
            onPress={() => onOpenRestaurant(item.id)}
          >
            <View style={styles.restaurantCover}>
              <Text style={styles.coverEmoji}>{"\\uD83C\\uDF55"}</Text>
            </View>
            <View style={styles.restaurantBody}>
              <View style={styles.rowBetween}>
                <Text style={styles.restaurantName}>{item.name}</Text>
                <View style={styles.ratingPill}>
                  <Text style={styles.ratingText}>
                    {ICON.star} {Number(item.rating ?? 0).toFixed(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.cuisine}>{item.city || 'Cidade nao definida'}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

function MenuScreen({
  restaurant,
  items,
  itemCount,
  total,
  loading,
  onBack,
  onAdd,
  onOpenCart,
  activeCategory,
  onChangeCategory,
}) {
  const categories = ['Todas', ...Array.from(new Set(items.map((item) => item.category || 'Sem categoria').filter(Boolean)))]
  const visibleItems =
    !activeCategory || activeCategory === 'Todas'
      ? items
      : items.filter((item) => (item.category || 'Sem categoria') === activeCategory)

  const groupedItems = visibleItems.reduce((acc, item) => {
    const cat = item.category || 'Sem categoria'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <View style={styles.screen}>
      <View style={styles.menuHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{ICON.back}</Text>
        </Pressable>
        <Text style={styles.menuHeaderTitle}>{restaurant?.name ?? 'Restaurante'}</Text>
      </View>

      <ScrollView
        horizontal
        style={styles.categoryStrip}
        contentContainerStyle={styles.categoryStripContent}
        showsHorizontalScrollIndicator={false}
      >
        {categories.map((category) => (
          <Pressable
            key={category}
            style={[
              styles.categoryChip,
              (activeCategory || 'Todas') === category ? styles.categoryChipActive : null,
            ]}
            onPress={() => onChangeCategory(category === 'Todas' ? '' : category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                (activeCategory || 'Todas') === category ? styles.categoryChipTextActive : null,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, itemCount > 0 ? styles.withCartBar : null]}
        showsVerticalScrollIndicator={false}
      >
        {loading && items.length === 0 ? <Text style={styles.mutedText}>A carregar...</Text> : null}
        {!loading && visibleItems.length === 0 ? (
          <Text style={styles.mutedText}>Sem pratos nesta categoria.</Text>
        ) : null}

        {Object.entries(groupedItems).map(([category, group]) => (
          <View key={category}>
            <Text style={styles.sectionTitle}>{category}</Text>
            {group.map((item) => (
              <View key={item.restaurant_product_id} style={styles.menuCard}>
                <View style={styles.menuThumb}>
                  <Text style={styles.menuThumbEmoji}>{"\\uD83C\\uDF55"}</Text>
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuName}>{item.name ?? 'Produto'}</Text>
                  <Text style={styles.menuDescription}>{item.description ?? 'Sem descricao'}</Text>
                  <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
                  <Text style={styles.menuRate}>
                    {item.is_available ? 'Disponivel' : 'Indisponivel'}
                  </Text>
                </View>

                <Pressable
                  style={styles.addButton}
                  onPress={() => onAdd(item)}
                  disabled={!item.is_available}
                >
                  <Text style={styles.addButtonText}>{ICON.plus}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {itemCount > 0 ? (
        <Pressable style={styles.cartBar} onPress={onOpenCart}>
          <Text style={styles.cartBarText}>{ICON.cart} {itemCount} item</Text>
          <Text style={styles.cartBarText}>Ver Carrinho</Text>
          <Text style={styles.cartBarText}>{formatCurrency(total)}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function paymentMethodLabel(method) {
  if (method === 'CASH') return 'Dinheiro a entrega'
  if (method === 'CARD') return 'Cartao'
  if (method === 'MBWAY') return 'MB Way'
  if (method === 'PAYPAL') return 'PayPal'
  return method
}

function CartScreen({
  items,
  subtotal,
  deliveryFee,
  total,
  loading,
  onDecrease,
  onIncrease,
  onRemove,
  onPlaceOrder,
  selectedAddress,
  paymentMethod,
  couponCode,
  onChangeCouponCode,
  onOpenAddressPicker,
  onOpenPaymentPicker,
}) {
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, styles.cartScroll]}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? <Text style={styles.mutedText}>Carrinho vazio.</Text> : null}

        {items.map((item) => (
          <View style={styles.cartCard} key={item.id}>
            <View style={styles.menuThumb}>
              <Text style={styles.menuThumbEmoji}>{"\\uD83C\\uDF55"}</Text>
            </View>

            <View style={styles.cartInfo}>
              <Text style={styles.menuName}>{item.product_name}</Text>
              <Text style={styles.cartPrice}>{formatCurrency(item.unit_price)}</Text>
              <View style={styles.qtyControl}>
                <Pressable style={styles.qtyButton} onPress={() => onDecrease(item.id, item.quantity)}>
                  <Text style={styles.qtyText}>{ICON.minus}</Text>
                </Pressable>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <Pressable style={styles.qtyButton} onPress={() => onIncrease(item.id, item.quantity)}>
                  <Text style={styles.qtyText}>{ICON.plus}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.removeButton} onPress={() => onRemove(item.id)}>
              <Text style={styles.removeText}>{ICON.close}</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.checkoutCard}>
          <Text style={styles.checkoutSectionTitle}>Detalhes da entrega</Text>

          <Pressable style={styles.checkoutRow} onPress={onOpenAddressPicker}>
            <View style={styles.checkoutRowText}>
              <Text style={styles.checkoutRowLabel}>Morada de entrega</Text>
              <Text style={styles.checkoutRowValue} numberOfLines={2}>
                {selectedAddress
                  ? `${selectedAddress.label ? selectedAddress.label + ' - ' : ''}${selectedAddress.street}, ${selectedAddress.city}`
                  : 'Escolher morada'}
              </Text>
            </View>
            <Text style={styles.checkoutRowArrow}>{'>'}</Text>
          </Pressable>

          <Pressable style={styles.checkoutRow} onPress={onOpenPaymentPicker}>
            <View style={styles.checkoutRowText}>
              <Text style={styles.checkoutRowLabel}>Metodo de pagamento</Text>
              <Text style={styles.checkoutRowValue}>{paymentMethodLabel(paymentMethod)}</Text>
            </View>
            <Text style={styles.checkoutRowArrow}>{'>'}</Text>
          </Pressable>

          <View style={styles.couponRow}>
            <Text style={styles.checkoutRowLabel}>Cupao</Text>
            <TextInput
              style={styles.couponInput}
              value={couponCode}
              onChangeText={onChangeCouponCode}
              placeholder="Codigo de cupao (opcional)"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.checkoutBar}>
        <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
        <SummaryLine label="Taxa de entrega" value={formatCurrency(deliveryFee)} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>

        <Pressable style={styles.orderButton} onPress={onPlaceOrder} disabled={loading || items.length === 0}>
          <Text style={styles.orderButtonText}>{loading ? 'A processar...' : 'Fazer Pedido'}</Text>
        </Pressable>
      </View>
    </View>
  )
}

function TrackingScreen({
  tracking,
  checkout,
  realtimeState,
  isOnline,
  onBack,
  onRefresh,
  onOpenChatRestaurant,
  onOpenChatCourier,
  chatLoading,
}) {
  const events = tracking?.events ?? []
  const realtimeLabel =
    realtimeState === 'live'
      ? 'AO VIVO'
      : realtimeState === 'connecting'
        ? 'A ligar'
        : realtimeState === 'error'
          ? 'Erro'
          : 'Offline'

  return (
    <View style={styles.screen}>
      <View style={styles.trackHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{ICON.back}</Text>
        </Pressable>

        <Text style={styles.trackTitle}>Acompanhar Pedido</Text>
        <Text style={styles.trackSub}>#{tracking?.order_id ? String(tracking.order_id).slice(0, 8) : '-'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isOnline ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Sem internet. O tracking sera atualizado automaticamente quando a ligacao voltar.
            </Text>
          </View>
        ) : null}

        {checkout?.payment_status === 'COMPLETED' ? (
          <View style={styles.paymentSuccessBanner}>
            <Text style={styles.paymentSuccessTitle}>Pagamento confirmado</Text>
            <Text style={styles.paymentSuccessText}>
              Total: EUR {Number(checkout.total ?? 0).toFixed(2)} via{' '}
              {checkout.payment_method ?? 'desconhecido'}
            </Text>
          </View>
        ) : null}

        <Pressable style={styles.successBanner} onPress={onRefresh}>
          <Text style={styles.successBannerText}>{ICON.check} Atualizar tracking</Text>
        </Pressable>

        <View style={styles.chatButtonsRow}>
          <Pressable
            style={styles.chatButton}
            onPress={onOpenChatRestaurant}
            disabled={chatLoading}
          >
            <Text style={styles.chatButtonText}>
              {chatLoading ? 'A abrir...' : 'Chat com restaurante'}
            </Text>
          </Pressable>
          {tracking?.courier_id ? (
            <Pressable
              style={styles.chatButton}
              onPress={onOpenChatCourier}
              disabled={chatLoading}
            >
              <Text style={styles.chatButtonText}>Chat com estafeta</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.trackCard}>
          <Text style={styles.trackSummaryTitle}>Estado atual</Text>
          <Text style={styles.trackSummarySub}>{statusLabel(tracking?.order_status)}</Text>
          <Text style={styles.trackSummarySub}>Entrega: {tracking?.delivery_status ?? '-'}</Text>
          <Text style={styles.trackSummarySub}>Realtime: {realtimeLabel}</Text>
          <Text style={styles.trackSummarySub}>
            Distancia restante: {tracking?.distance_km_remaining ?? '-'} km
          </Text>
          <Text style={styles.trackSummarySub}>
            ETA: {tracking?.eta_seconds ? `${Math.ceil(tracking.eta_seconds / 60)} min` : '-'}
          </Text>
          <Text style={styles.trackSummarySub}>Total: {formatCurrency(checkout?.total ?? 0)}</Text>
        </View>

        <NativeDeliveryMapCard
          title="Mapa da entrega"
          subtitle="Posicao em tempo real do estafeta entre pickup e dropoff"
          pickup={
            tracking?.pickup_latitude !== null && tracking?.pickup_latitude !== undefined
              ? {
                  lat: tracking.pickup_latitude,
                  lng: tracking.pickup_longitude,
                  label: 'Pickup',
                }
              : null
          }
          dropoff={
            tracking?.dropoff_latitude !== null && tracking?.dropoff_latitude !== undefined
              ? {
                  lat: tracking.dropoff_latitude,
                  lng: tracking.dropoff_longitude,
                  label: 'Dropoff',
                }
              : null
          }
          courier={
            tracking?.latest_position
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

        <View style={styles.trackDetailsCard}>
          <Text style={styles.sectionTitle}>Eventos</Text>
          {events.length === 0 ? <Text style={styles.mutedText}>Sem eventos ainda.</Text> : null}
          {events.map((event) => (
            <View key={`${event.event_type}-${event.timestamp}`} style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>{event.event_type}</Text>
              <Text style={styles.summaryValue}>
                {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '-'}
              </Text>
            </View>
          ))}
        </View>

        <RealtimeTopicsCard />
      </ScrollView>
    </View>
  )
}

function SummaryLine({ label, value }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

const CANCELLABLE_STATUSES = ['PENDING', 'CONFIRMED']
const TRACKABLE_STATUSES = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']

function OrdersHistoryScreen({
  orders,
  loading,
  busyOrderId,
  onBack,
  onRefresh,
  onCancel,
  onRepeat,
  onTrack,
  onReview,
  onOpenDetail,
  onLoadMore,
  hasMore,
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.trackHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </Pressable>
        <Text style={styles.trackTitle}>Meus pedidos</Text>
        <Text style={styles.trackSub}>Historico de encomendas</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={Boolean(loading)} onRefresh={onRefresh} tintColor="#3479ed" />
        }
      >
        <Pressable style={styles.successBanner} onPress={onRefresh} disabled={loading}>
          <Text style={styles.successBannerText}>
            {loading ? 'A carregar...' : 'Atualizar pedidos'}
          </Text>
        </Pressable>

        {!loading && orders.length === 0 ? (
          <Text style={styles.mutedText}>Sem pedidos no historico.</Text>
        ) : null}

        {orders.length > 0 && hasMore ? null : orders.length > 0 ? (
          <Text style={styles.mutedText}>Fim do historico.</Text>
        ) : null}

        {orders.map((order) => {
          const canCancel = CANCELLABLE_STATUSES.includes(order.status)
          const canTrack = TRACKABLE_STATUSES.includes(order.status)
          const canReview = order.status === 'DELIVERED'
          const isBusy = busyOrderId === order.id

          return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderCardTop}>
                <View style={styles.orderCardHeading}>
                  <Text style={styles.orderCardRestaurant}>{order.restaurant_name ?? '-'}</Text>
                  <Text style={styles.orderCardDate}>
                    {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
                  </Text>
                </View>
                <Text style={[styles.orderStatusChip, orderStatusChipStyle(order.status)]}>
                  {statusLabel(order.status)}
                </Text>
              </View>

              {order.items_summary ? (
                <Text style={styles.orderCardItems} numberOfLines={2}>
                  {order.items_summary}
                </Text>
              ) : null}

              <View style={styles.orderCardFooter}>
                <Text style={styles.orderCardTotal}>{`EUR ${Number(order.total ?? 0).toFixed(2)}`}</Text>
                <View style={styles.orderCardActions}>
                  {canTrack ? (
                    <Pressable
                      style={styles.orderActionBtn}
                      onPress={() => onTrack(order)}
                      disabled={isBusy}
                    >
                      <Text style={styles.orderActionBtnText}>Acompanhar</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={styles.orderActionBtn}
                    onPress={() => onOpenDetail(order)}
                  >
                    <Text style={styles.orderActionBtnText}>Detalhe</Text>
                  </Pressable>
                  <Pressable
                    style={styles.orderActionBtn}
                    onPress={() => onRepeat(order)}
                    disabled={isBusy}
                  >
                    <Text style={styles.orderActionBtnText}>
                      {isBusy ? 'A repetir...' : 'Repetir'}
                    </Text>
                  </Pressable>
                  {canCancel ? (
                    <Pressable
                      style={[styles.orderActionBtn, styles.orderActionDanger]}
                      onPress={() => onCancel(order)}
                      disabled={isBusy}
                    >
                      <Text style={[styles.orderActionBtnText, styles.orderActionDangerText]}>
                        Cancelar
                      </Text>
                    </Pressable>
                  ) : null}
                  {canReview && order.restaurant_id ? (
                    <Pressable
                      style={styles.orderActionBtn}
                      onPress={() => onReview(order, 'RESTAURANT', order.restaurant_id)}
                    >
                      <Text style={styles.orderActionBtnText}>Avaliar restaurante</Text>
                    </Pressable>
                  ) : null}
                  {canReview && order.courier_id ? (
                    <Pressable
                      style={styles.orderActionBtn}
                      onPress={() => onReview(order, 'COURIER', order.courier_id)}
                    >
                      <Text style={styles.orderActionBtnText}>Avaliar estafeta</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          )
        })}

        {orders.length > 0 && hasMore ? (
          <Pressable
            style={[styles.addressAddBtn, { marginTop: 12 }]}
            onPress={onLoadMore}
            disabled={loading}
          >
            <Text style={styles.addressAddBtnText}>
              {loading ? 'A carregar...' : 'Carregar mais'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  )
}

function ProfileScreen({
  session,
  profileDraft,
  onChangeDraft,
  isSavingProfile,
  onSave,
  onBack,
  onLogoutRequest,
  addresses,
  onOpenAddresses,
  onOpenReviewsHistory,
  reviewsCount,
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.trackHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </Pressable>
        <Text style={styles.trackTitle}>Perfil</Text>
        <Text style={styles.trackSub}>{session?.email ?? '-'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.checkoutCard}>
          <Text style={styles.checkoutSectionTitle}>Dados pessoais</Text>

          <Text style={styles.checkoutRowLabel}>Nome</Text>
          <TextInput
            style={styles.couponInput}
            value={profileDraft.name}
            onChangeText={(text) => onChangeDraft((current) => ({ ...current, name: text }))}
            placeholder="Nome completo"
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.checkoutRowLabel}>Email</Text>
          <TextInput
            style={styles.couponInput}
            value={profileDraft.email}
            onChangeText={(text) => onChangeDraft((current) => ({ ...current, email: text }))}
            placeholder="email@dominio.pt"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Pressable
            style={[styles.orderButton, isSavingProfile ? { opacity: 0.6 } : null]}
            onPress={onSave}
            disabled={isSavingProfile}
          >
            <Text style={styles.orderButtonText}>
              {isSavingProfile ? 'A guardar...' : 'Guardar perfil'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.checkoutCard}>
          <Text style={styles.checkoutSectionTitle}>Moradas</Text>
          <Text style={styles.checkoutRowValue}>
            {addresses.length === 0
              ? 'Sem moradas guardadas.'
              : `${addresses.length} morada(s) guardada(s).`}
          </Text>
          <Pressable style={[styles.addressAddBtn, { marginTop: 12 }]} onPress={onOpenAddresses}>
            <Text style={styles.addressAddBtnText}>Gerir moradas</Text>
          </Pressable>
        </View>

        <View style={styles.checkoutCard}>
          <Text style={styles.checkoutSectionTitle}>Minhas avaliacoes</Text>
          <Text style={styles.checkoutRowValue}>
            {reviewsCount === 0
              ? 'Sem avaliacoes ainda.'
              : `${reviewsCount} avaliacao(oes) submetida(s).`}
          </Text>
          <Pressable
            style={[styles.addressAddBtn, { marginTop: 12 }]}
            onPress={onOpenReviewsHistory}
          >
            <Text style={styles.addressAddBtnText}>Ver avaliacoes</Text>
          </Pressable>
        </View>

        <View style={styles.checkoutCard}>
          <Text style={styles.checkoutSectionTitle}>Sessao</Text>
          <Pressable
            style={[styles.cancelDanger, { marginTop: 8 }]}
            onPress={onLogoutRequest}
          >
            <Text style={styles.cancelDangerText}>Terminar sessao</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  )
}

function orderStatusChipStyle(status) {
  if (status === 'DELIVERED') return styles.orderStatusOk
  if (status === 'CANCELLED') return styles.orderStatusOff
  if (status === 'OUT_FOR_DELIVERY' || status === 'READY') return styles.orderStatusGo
  return styles.orderStatusPending
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f2f4f7' },
  screen: { flex: 1, backgroundColor: '#f2f4f7' },
  homeHeader: {
    backgroundColor: '#2f6fe9',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  homeHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#ffffff', fontSize: 39, fontWeight: '900' },
  subtitle: { color: '#dbe7ff', fontSize: 16, marginTop: 2 },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: { color: '#ffffff', fontSize: 17 },
  searchField: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchIcon: { color: '#9db8f8', fontSize: 14 },
  searchText: { color: '#dbe7ff', fontSize: 15, fontWeight: '500' },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  filterRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  filterInput: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  filterApply: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  filterApplyText: {
    color: '#1d4ed8',
    fontWeight: '800',
    fontSize: 12,
  },
  filterReset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  filterResetText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  offlineBanner: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: '#fef9c3',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  offlineBannerText: {
    color: '#854d0e',
    fontSize: 13,
    fontWeight: '700',
  },
  notificationBanner: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  notificationBannerTitle: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '800',
  },
  notificationBannerText: {
    color: '#1e40af',
    fontSize: 12,
    marginTop: 2,
  },
  pushBanner: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pushBannerText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  activeOrderBtn: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeOrderBtnText: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 18 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  mutedText: { color: '#64748b', fontSize: 14, marginBottom: 8 },
  restaurantCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 14,
  },
  restaurantCover: {
    height: 100,
    backgroundColor: '#ff7900',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 40 },
  restaurantBody: { paddingHorizontal: 14, paddingVertical: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  restaurantName: { color: '#0f172a', fontSize: 17, fontWeight: '800', flex: 1, paddingRight: 8 },
  ratingPill: {
    borderRadius: 999,
    backgroundColor: '#d9fbe4',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  ratingText: { color: '#14803c', fontSize: 13, fontWeight: '700' },
  cuisine: { color: '#64748b', fontSize: 13, marginTop: 4 },
  menuHeader: {
    backgroundColor: '#ff6900',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: 2 },
  backArrow: { color: '#ffffff', fontSize: 23, fontWeight: '700' },
  menuHeaderTitle: { color: '#ffffff', fontSize: 32, fontWeight: '900', marginTop: 4 },
  categoryStrip: {
    maxHeight: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryStripContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: '#ff6900',
    borderColor: '#ff6900',
  },
  categoryChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  menuCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  menuThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#ff7900',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuThumbEmoji: { fontSize: 30 },
  menuInfo: { flex: 1 },
  menuName: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  menuDescription: { color: '#64748b', fontSize: 13, marginTop: 2 },
  menuPrice: { color: '#ff5f00', fontSize: 15, fontWeight: '900', marginTop: 5 },
  menuRate: { color: '#334155', fontSize: 12, marginTop: 2, fontWeight: '600' },
  addButton: {
    width: 44,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#3479ed',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonText: { color: '#ffffff', fontSize: 24, lineHeight: 24, marginTop: -3 },
  withCartBar: { paddingBottom: 96 },
  cartBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    borderRadius: 12,
    backgroundColor: '#3479ed',
    paddingHorizontal: 13,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartBarText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  cartScroll: { flexGrow: 1 },
  cartCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartInfo: { flex: 1 },
  cartPrice: { color: '#64748b', fontSize: 14, marginTop: 2 },
  qtyControl: {
    marginTop: 10,
    alignSelf: 'flex-start',
    height: 36,
    borderRadius: 10,
    backgroundColor: '#edf1f7',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyButton: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { color: '#111827', fontSize: 20, lineHeight: 20 },
  qtyValue: { color: '#111827', fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeButton: { paddingHorizontal: 4, alignSelf: 'flex-start', marginTop: 2 },
  removeText: { color: '#ef4444', fontSize: 26 },
  checkoutBar: {
    borderTopWidth: 1,
    borderTopColor: '#d7dee8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { color: '#475569', fontSize: 14 },
  summaryValue: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#d7dee8',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  totalValue: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  orderButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3479ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  trackHeader: {
    backgroundColor: '#2f6fe9',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  trackTitle: { color: '#ffffff', fontSize: 32, fontWeight: '900', marginTop: 4 },
  trackSub: { color: '#dbe7ff', fontSize: 15, marginTop: 4 },
  trackCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  trackSummaryTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  trackSummarySub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  trackDetailsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  successBanner: {
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    backgroundColor: '#e7f7ef',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  paymentSuccessBanner: {
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  paymentSuccessTitle: {
    color: '#14532d',
    fontSize: 16,
    fontWeight: '900',
  },
  paymentSuccessText: {
    color: '#166534',
    fontSize: 13,
    marginTop: 4,
  },
  successBannerText: { color: '#0f8f46', fontSize: 14, fontWeight: '700' },
  successText: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    backgroundColor: '#ecfdf5',
    borderColor: '#16a34a',
    borderWidth: 1,
    borderRadius: 10,
    color: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '700',
  },
  errorText: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
    borderWidth: 1,
    borderRadius: 10,
    color: '#991b1b',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: { color: '#ffffff', fontSize: 17 },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  inboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  inboxCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    maxHeight: '90%',
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inboxTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  inboxSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  inboxClose: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxCloseText: {
    color: '#475569',
    fontSize: 22,
    lineHeight: 22,
  },
  inboxActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  inboxFilter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  inboxFilterActive: {
    backgroundColor: '#3479ed',
    borderColor: '#3479ed',
  },
  inboxFilterText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  inboxFilterTextActive: {
    color: '#ffffff',
  },
  inboxList: {
    marginTop: 4,
    maxHeight: 480,
  },
  inboxListContent: {
    paddingBottom: 12,
  },
  inboxEmpty: {
    color: '#64748b',
    fontSize: 13,
    paddingVertical: 12,
  },
  inboxItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  inboxItemRead: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  inboxItemUnread: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  inboxItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  inboxItemTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  inboxItemBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  inboxItemBadgeUnread: {
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
  },
  inboxItemBadgeRead: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  inboxItemMessage: {
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
  },
  inboxItemFooter: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inboxItemTimestamp: {
    color: '#64748b',
    fontSize: 11,
  },
  inboxItemAction: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '800',
  },
  inboxItemReadLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  ordersLink: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  ordersLinkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  orderCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 10,
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  orderCardHeading: {
    flex: 1,
  },
  orderCardRestaurant: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  orderCardDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  orderStatusChip: {
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  orderStatusOk: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  orderStatusOff: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  orderStatusGo: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  orderStatusPending: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  orderCardItems: {
    marginTop: 8,
    color: '#475569',
    fontSize: 13,
  },
  orderCardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  orderCardTotal: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },
  orderCardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 1,
  },
  orderActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3479ed',
    backgroundColor: '#ffffff',
  },
  orderActionBtnText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '800',
  },
  orderActionDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  orderActionDangerText: {
    color: '#b91c1c',
  },
  cancelOrderCard: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
  },
  cancelSummaryRow: {
    marginTop: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelSummaryLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelInputLabel: {
    marginTop: 12,
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d5dce7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  cancelActionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  cancelSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelSecondaryText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelDanger: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDangerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  checkoutCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  checkoutSectionTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  checkoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  checkoutRowText: {
    flex: 1,
  },
  checkoutRowLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  checkoutRowValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  checkoutRowArrow: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '900',
    paddingLeft: 8,
  },
  couponRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingTop: 10,
  },
  couponInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d5dce7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    marginBottom: 6,
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  addressOptionSelected: {
    borderColor: '#3479ed',
    backgroundColor: '#eff6ff',
  },
  addressOptionMain: {
    flex: 1,
  },
  addressOptionLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  addressOptionDetail: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  addressOptionActions: {
    flexDirection: 'column',
    gap: 4,
    marginLeft: 6,
  },
  addressSetDefault: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  addressSetDefaultText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
  },
  addressDeleteBtn: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  addressDeleteText: {
    color: '#b91c1c',
    fontSize: 10,
    fontWeight: '800',
  },
  addressAddBtn: {
    borderWidth: 1,
    borderColor: '#3479ed',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  addressAddBtnText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '800',
  },
  addressForm: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  addressDefaultToggle: {
    paddingVertical: 6,
  },
  addressDefaultToggleText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  failModalCardClient: {
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
  },
  paymentOption: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  paymentOptionSelected: {
    borderColor: '#3479ed',
    backgroundColor: '#eff6ff',
  },
  paymentOptionText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  paymentOptionTextSelected: {
    color: '#1d4ed8',
    fontWeight: '900',
  },
  optionGroupCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  optionGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionGroupName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  optionGroupRule: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  optionRowChecked: {
    backgroundColor: '#eff6ff',
  },
  optionRowText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  optionRowTextChecked: {
    color: '#1d4ed8',
    fontWeight: '800',
  },
  optionRowPrice: {
    color: '#64748b',
    fontSize: 12,
  },
  optionQuantityRow: {
    marginTop: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentCountdown: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentCountdownLabel: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '700',
  },
  paymentCountdownValue: {
    color: '#92400e',
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  paymentCountdownDanger: {
    color: '#b91c1c',
  },
  confirmSummary: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  starsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  starButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starText: {
    fontSize: 30,
    color: '#cbd5e1',
  },
  starTextActive: {
    color: '#f59e0b',
  },
  ratingLabel: {
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  chatButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  chatButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '800',
  },
  chatBubble: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  chatBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#3479ed',
  },
  chatBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
  },
  chatBubbleText: {
    color: '#0f172a',
    fontSize: 14,
  },
  chatBubbleTime: {
    color: '#475569',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  chatComposeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d5dce7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
    minHeight: 44,
    maxHeight: 100,
  },
  chatSendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3479ed',
  },
  chatSendBtnText: {
    color: '#ffffff',
    fontWeight: '800',
  },
})
