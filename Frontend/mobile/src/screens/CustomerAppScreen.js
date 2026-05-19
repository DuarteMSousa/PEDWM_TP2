import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { AddressMapPicker } from '../components/maps/AddressMapPicker'
import {
  CartScreen,
  HomeScreen,
  MenuScreen,
  OrdersHistoryScreen,
  ProfileScreen,
  SummaryLine,
  TrackingScreen,
} from './customer/childScreens'
import { styles } from './customer/styles'
import {
  CANCELLABLE_STATUSES,
  TRACKABLE_STATUSES,
  ICON,
  INBOX_MAX_ITEMS,
  formatCurrency,
  orderStatusChipStyle,
  paymentMethodLabel,
  statusLabel,
} from './customer/utils'
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

export function CustomerAppScreen({ session, pushStatus, onLogout, deepLink, onConsumeDeepLink }) {
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
    // Polling de fallback apenas se o socket nao esta live.
    if (realtimeState === 'live') {
      return undefined
    }

    const timer = setInterval(() => {
      loadTracking(activeOrderId)
    }, 15000)

    return () => clearInterval(timer)
  }, [route, activeOrderId, realtimeState])

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
            // Pos-entrega: abrir prompt de avaliacao do restaurante automaticamente.
            if (eventName === 'ORDER_DELIVERED' && eventOrderId) {
              promptReviewAfterDelivery(eventOrderId)
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

  // Prompt automatico apos receber ORDER_DELIVERED via realtime.
  async function promptReviewAfterDelivery(orderId) {
    try {
      // Tenta usar info ja em memoria (tracking ou historico) sem ir buscar de novo.
      const fromHistory = ordersHistory.find((entry) => entry.id === orderId)
      let restaurantId = fromHistory?.restaurant_id ?? null
      let restaurantName = fromHistory?.restaurant_name ?? tracking?.restaurant_name ?? null

      if (!restaurantId) {
        const detail = await fetchClientOrderDetail({ session, orderId })
        restaurantId = detail?.restaurant_id ?? detail?.restaurant?.id ?? null
        restaurantName = detail?.restaurant_name_snapshot ?? detail?.restaurant?.name ?? restaurantName
      }

      if (!restaurantId) return
      if (hasReviewFor('RESTAURANT', restaurantId)) return

      setReviewTarget({
        orderId,
        restaurantName: restaurantName ?? 'restaurante',
        targetType: 'RESTAURANT',
        targetId: restaurantId,
      })
      setReviewRating(5)
      setReviewComment('')
      setEditingReview(null)
    } catch {
      // ignore - prompt e opcional
    }
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

  // Deep link de push notification: abrir tracking do pedido recebido.
  useEffect(() => {
    if (!deepLink?.orderId) return
    if (deepLink.target && deepLink.target !== 'tracking') return

    setActiveOrderId(deepLink.orderId)
    setRoute('tracking')
    loadTracking(deepLink.orderId)
    if (onConsumeDeepLink) onConsumeDeepLink()
  }, [deepLink])

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

                  <AddressMapPicker
                    latitude={Number(addressDraft.latitude)}
                    longitude={Number(addressDraft.longitude)}
                    onChange={({ latitude, longitude }) =>
                      setAddressDraft((current) => ({
                        ...current,
                        latitude: String(latitude.toFixed(6)),
                        longitude: String(longitude.toFixed(6)),
                      }))
                    }
                  />

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

