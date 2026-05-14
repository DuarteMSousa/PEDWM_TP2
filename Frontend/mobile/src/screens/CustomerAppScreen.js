import { useEffect, useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { RealtimeTopicsCard } from '../components/realtime/RealtimeTopicsCard'
import { NativeDeliveryMapCard } from '../components/maps/NativeDeliveryMapCard'
import {
  addCartItem,
  checkoutCart,
  fetchMyCart,
  fetchMyOrders,
  fetchOrderTracking,
  fetchRestaurantMenu,
  fetchRestaurants,
  removeCartItem,
  updateCartItem,
} from '../services/commerceService'
import { subscribeToOrderTracking } from '../services/realtime/trackingRealtime'

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

export function CustomerAppScreen({ session, onLogout }) {
  const [route, setRoute] = useState('home')
  const [restaurants, setRestaurants] = useState([])
  const [restaurantId, setRestaurantId] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [activeOrderId, setActiveOrderId] = useState('')
  const [lastCheckout, setLastCheckout] = useState(null)
  const [realtimeState, setRealtimeState] = useState('offline')
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')

  const restaurant = useMemo(
    () => restaurants.find((item) => item.id === restaurantId) ?? restaurants[0],
    [restaurantId, restaurants],
  )

  const cartItems = cart?.items ?? []
  const itemCount = cartItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0)
  const deliveryFee = 0
  const total = subtotal + deliveryFee

  useEffect(() => {
    bootstrap()
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
        },
      })
    } catch {
      setRealtimeState('error')
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [route, activeOrderId, session?.token, session?.devUserId])

  async function bootstrap() {
    try {
      setLoading(true)
      const [nextRestaurants, nextCart, activeOrders] = await Promise.all([
        fetchRestaurants(session),
        fetchMyCart(session),
        fetchMyOrders(session, { activeOnly: true, limit: 1 }),
      ])

      setRestaurants(nextRestaurants)
      if (nextRestaurants.length > 0) {
        setRestaurantId(nextRestaurants[0].id)
      }

      setCart(nextCart)

      if (activeOrders.length > 0) {
        setActiveOrderId(activeOrders[0].id)
      }

      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function openRestaurant(id) {
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
    const nextCart = await fetchMyCart(session)
    setCart(nextCart)
  }

  async function addToCart(restaurantProductId) {
    try {
      setLoading(true)
      const nextCart = await addCartItem({
        session,
        restaurantProductId,
        quantity: 1,
      })
      setCart(nextCart)
      setSuccessText('Item adicionado ao carrinho.')
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function decrease(cartItemId, quantity) {
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
    try {
      setLoading(true)
      const result = await checkoutCart(session)
      setLastCheckout(result)
      setActiveOrderId(result.order_id)
      setRoute('tracking')
      setSuccessText('Pedido criado com sucesso.')
      setErrorText('')
      await refreshCart()
      await loadTracking(result.order_id)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadTracking(orderId) {
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
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {route === 'home' && (
        <HomeScreen
          restaurants={restaurants}
          loading={loading}
          onOpenRestaurant={openRestaurant}
          onOpenTracking={() => {
            if (activeOrderId) {
              setRoute('tracking')
              loadTracking(activeOrderId)
            }
          }}
          hasActiveOrder={Boolean(activeOrderId)}
          onLogout={onLogout}
        />
      )}
      {route === 'menu' && (
        <MenuScreen
          restaurant={restaurant}
          items={menuItems}
          itemCount={itemCount}
          total={total}
          loading={loading}
          onBack={back}
          onAdd={addToCart}
          onOpenCart={() => setRoute('cart')}
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
        />
      )}
      {route === 'tracking' && (
        <TrackingScreen
          tracking={tracking}
          checkout={lastCheckout}
          realtimeState={realtimeState}
          onBack={back}
          onRefresh={() => activeOrderId && loadTracking(activeOrderId)}
        />
      )}

      {successText ? <Text style={styles.successText}>{ICON.check} {successText}</Text> : null}
      {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
    </SafeAreaView>
  )
}

function HomeScreen({ restaurants, loading, onOpenRestaurant, onOpenTracking, hasActiveOrder, onLogout }) {
  return (
    <View style={styles.screen}>
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderTop}>
          <View>
            <Text style={styles.brand}>FastBite</Text>
            <Text style={styles.subtitle}>O que deseja comer hoje?</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={onLogout}>
            <Text style={styles.profileIcon}>{ICON.user}</Text>
          </Pressable>
        </View>

        <View style={styles.searchField}>
          <Text style={styles.searchIcon}>{ICON.search}</Text>
          <Text style={styles.searchText}>Restaurantes integrados via backend</Text>
        </View>

        {hasActiveOrder ? (
          <Pressable style={styles.activeOrderBtn} onPress={onOpenTracking}>
            <Text style={styles.activeOrderBtnText}>Ver pedido ativo</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

function MenuScreen({ restaurant, items, itemCount, total, loading, onBack, onAdd, onOpenCart }) {
  return (
    <View style={styles.screen}>
      <View style={styles.menuHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{ICON.back}</Text>
        </Pressable>
        <Text style={styles.menuHeaderTitle}>{restaurant?.name ?? 'Restaurante'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, itemCount > 0 ? styles.withCartBar : null]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Menu</Text>
        {loading && items.length === 0 ? <Text style={styles.mutedText}>A carregar...</Text> : null}
        {items.map((item) => (
          <View key={item.restaurant_product_id} style={styles.menuCard}>
            <View style={styles.menuThumb}>
              <Text style={styles.menuThumbEmoji}>{"\\uD83C\\uDF55"}</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuName}>{item.name ?? 'Produto'}</Text>
              <Text style={styles.menuDescription}>{item.description ?? 'Sem descricao'}</Text>
              <Text style={styles.menuPrice}>{formatCurrency(item.price)}</Text>
              <Text style={styles.menuRate}>{item.is_available ? 'Disponivel' : 'Indisponivel'}</Text>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={() => onAdd(item.restaurant_product_id)}
              disabled={!item.is_available}
            >
              <Text style={styles.addButtonText}>{ICON.plus}</Text>
            </Pressable>
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
}) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, styles.cartScroll]} showsVerticalScrollIndicator={false}>
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

function TrackingScreen({ tracking, checkout, realtimeState, onBack, onRefresh }) {
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
        <Pressable style={styles.successBanner} onPress={onRefresh}>
          <Text style={styles.successBannerText}>{ICON.check} Atualizar tracking</Text>
        </Pressable>

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
})
