import { useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { RealtimeTopicsCard } from '../components/realtime/RealtimeTopicsCard'

const RESTAURANTS = [
  {
    id: 'pizzaria-centro',
    name: 'Pizzaria do Centro',
    cuisine: 'Italiana',
    eta: '25-35 min',
    fee: 2.5,
    rating: 4.8,
    emoji: '\u{1F355}',
  },
  {
    id: 'sushi-palace',
    name: 'Sushi Palace',
    cuisine: 'Japonesa',
    eta: '30-40 min',
    fee: 3,
    rating: 4.9,
    emoji: '\u{1F363}',
  },
]

const MENU = {
  'pizzaria-centro': [
    {
      id: 'margherita',
      name: 'Pizza Margherita',
      description: 'Molho de tomate, mozzarella, manjericao fresco',
      price: 12.5,
      rating: 4.8,
      emoji: '\u{1F355}',
    },
    {
      id: 'pepperoni',
      name: 'Pizza Pepperoni',
      description: 'Molho de tomate, mozzarella, pepperoni',
      price: 14,
      rating: 4.9,
      emoji: '\u{1F355}',
    },
    {
      id: 'lasanha',
      name: 'Lasanha Bolonhesa',
      description: 'Massa fresca, molho bolonhesa, bechamel',
      price: 11,
      rating: 4.7,
      emoji: '\u{1F355}',
    },
    {
      id: 'carbonara',
      name: 'Spaghetti Carbonara',
      description: 'Spaghetti, bacon, ovos, queijo pecorino',
      price: 10.5,
      rating: 4.8,
      emoji: '\u{1F355}',
    },
  ],
}

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
  pin: '\u{1F4CD}',
}

export function CustomerAppScreen({ onLogout }) {
  const [route, setRoute] = useState('home')
  const [restaurantId, setRestaurantId] = useState('pizzaria-centro')
  const [cart, setCart] = useState({})
  const [showAddedAlert, setShowAddedAlert] = useState(false)
  const [showSuccessAlert, setShowSuccessAlert] = useState(false)

  const restaurant = useMemo(
    () => RESTAURANTS.find((item) => item.id === restaurantId) ?? RESTAURANTS[0],
    [restaurantId],
  )

  const menu = MENU[restaurantId] ?? []

  const cartItems = useMemo(
    () =>
      menu
        .filter((item) => (cart[item.id] ?? 0) > 0)
        .map((item) => ({ ...item, quantity: cart[item.id] })),
    [cart, menu],
  )

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = subtotal > 0 ? 2.5 : 0
  const total = subtotal + deliveryFee

  function openRestaurant(id) {
    setRestaurantId(id)
    setRoute('menu')
  }

  function back() {
    if (route === 'menu') {
      setRoute('home')
      return
    }
    if (route === 'cart') {
      setRoute('menu')
      return
    }
    if (route === 'tracking') {
      setRoute('menu')
      setShowSuccessAlert(false)
    }
  }

  function addToCart(itemId) {
    setCart((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }))
    setShowAddedAlert(true)
  }

  function decrease(itemId) {
    setCart((current) => {
      const nextQty = (current[itemId] ?? 0) - 1
      if (nextQty <= 0) {
        const { [itemId]: removed, ...rest } = current
        return rest
      }
      return { ...current, [itemId]: nextQty }
    })
  }

  function remove(itemId) {
    setCart((current) => {
      const { [itemId]: removed, ...rest } = current
      return rest
    })
  }

  function placeOrder() {
    setRoute('tracking')
    setShowAddedAlert(false)
    setShowSuccessAlert(true)
  }

  return (
    <SafeAreaView style={styles.safe}>
      {route === 'home' && (
        <HomeScreen restaurants={RESTAURANTS} onOpenRestaurant={openRestaurant} onLogout={onLogout} />
      )}
      {route === 'menu' && (
        <MenuScreen
          restaurant={restaurant}
          items={menu}
          itemCount={itemCount}
          total={total}
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
          showAddedAlert={showAddedAlert}
          onDismissAlert={() => setShowAddedAlert(false)}
          onDecrease={decrease}
          onIncrease={addToCart}
          onRemove={remove}
          onPlaceOrder={placeOrder}
        />
      )}
      {route === 'tracking' && (
        <TrackingScreen
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          total={total}
          showSuccessAlert={showSuccessAlert}
          onBack={back}
        />
      )}
    </SafeAreaView>
  )
}

function HomeScreen({ restaurants, onOpenRestaurant, onLogout }) {
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
          <Text style={styles.searchText}>Procurar restaurantes...</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Restaurantes proximos</Text>
        {restaurants.map((restaurant) => (
          <Pressable
            key={restaurant.id}
            style={styles.restaurantCard}
            onPress={() => onOpenRestaurant(restaurant.id)}
          >
            <View style={styles.restaurantCover}>
              <Text style={styles.coverEmoji}>{restaurant.emoji}</Text>
            </View>
            <View style={styles.restaurantBody}>
              <View style={styles.rowBetween}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <View style={styles.ratingPill}>
                  <Text style={styles.ratingText}>
                    {ICON.star} {restaurant.rating.toFixed(1)}
                  </Text>
                </View>
              </View>

              <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
              <Text style={styles.metaLine}>
                {ICON.time} {restaurant.eta}    {ICON.bike} EUR {restaurant.fee.toFixed(2)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

function MenuScreen({ restaurant, items, itemCount, total, onBack, onAdd, onOpenCart }) {
  return (
    <View style={styles.screen}>
      <View style={styles.menuHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{ICON.back}</Text>
        </Pressable>
        <Text style={styles.menuHeaderTitle}>{restaurant.name}</Text>
        <Text style={styles.menuHeaderMeta}>
          {ICON.star} {restaurant.rating.toFixed(1)}    {ICON.time} {restaurant.eta}    {ICON.bike} EUR {restaurant.fee.toFixed(2)}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, itemCount > 0 ? styles.withCartBar : null]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Menu</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.menuCard}>
            <View style={styles.menuThumb}>
              <Text style={styles.menuThumbEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuName}>{item.name}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
              <Text style={styles.menuPrice}>EUR {item.price.toFixed(2)}</Text>
              <Text style={styles.menuRate}>
                {ICON.star} {item.rating.toFixed(1)}
              </Text>
            </View>

            <Pressable style={styles.addButton} onPress={() => onAdd(item.id)}>
              <Text style={styles.addButtonText}>{ICON.plus}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {itemCount > 0 && (
        <Pressable style={styles.cartBar} onPress={onOpenCart}>
          <Text style={styles.cartBarText}>
            {ICON.cart} {itemCount} item
          </Text>
          <Text style={styles.cartBarText}>Ver Carrinho</Text>
          <Text style={styles.cartBarText}>EUR {total.toFixed(2)}</Text>
        </Pressable>
      )}
    </View>
  )
}

function CartScreen({
  items,
  subtotal,
  deliveryFee,
  total,
  showAddedAlert,
  onDismissAlert,
  onDecrease,
  onIncrease,
  onRemove,
  onPlaceOrder,
}) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scrollContent, styles.cartScroll]} showsVerticalScrollIndicator={false}>
        {showAddedAlert && (
          <Pressable style={styles.successBanner} onPress={onDismissAlert}>
            <Text style={styles.successBannerText}>
              {ICON.check} Adicionado ao carrinho
            </Text>
          </Pressable>
        )}

        {items.map((item) => (
          <View style={styles.cartCard} key={item.id}>
            <View style={styles.menuThumb}>
              <Text style={styles.menuThumbEmoji}>{item.emoji}</Text>
            </View>

            <View style={styles.cartInfo}>
              <Text style={styles.menuName}>{item.name}</Text>
              <Text style={styles.cartPrice}>EUR {item.price.toFixed(2)}</Text>
              <View style={styles.qtyControl}>
                <Pressable style={styles.qtyButton} onPress={() => onDecrease(item.id)}>
                  <Text style={styles.qtyText}>{ICON.minus}</Text>
                </Pressable>
                <Text style={styles.qtyValue}>{item.quantity}</Text>
                <Pressable style={styles.qtyButton} onPress={() => onIncrease(item.id)}>
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
        <SummaryLine label="Subtotal" value={`EUR ${subtotal.toFixed(2)}`} />
        <SummaryLine label="Taxa de entrega" value={`EUR ${deliveryFee.toFixed(2)}`} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>EUR {total.toFixed(2)}</Text>
        </View>

        <Pressable style={styles.orderButton} onPress={onPlaceOrder}>
          <Text style={styles.orderButtonText}>Fazer Pedido</Text>
        </Pressable>
      </View>
    </View>
  )
}

function TrackingScreen({ subtotal, deliveryFee, total, showSuccessAlert, onBack }) {
  return (
    <View style={styles.screen}>
      <View style={styles.trackHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backArrow}>{ICON.back}</Text>
        </Pressable>

        <Text style={styles.trackTitle}>Acompanhar Pedido</Text>
        <Text style={styles.trackSub}>Pedido #4614</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {showSuccessAlert && (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>
              {ICON.check} Pedido realizado com sucesso!
            </Text>
          </View>
        )}

        <View style={styles.trackCard}>
          <View style={styles.trackSummaryRow}>
            <View style={styles.prepDot}>
              <Text style={styles.prepIcon}>{ICON.prep}</Text>
            </View>
            <View style={styles.trackSummaryTextWrap}>
              <Text style={styles.trackSummaryTitle}>A preparar</Text>
              <Text style={styles.trackSummarySub}>Restaurante a preparar o pedido</Text>
            </View>
          </View>

          <View style={styles.progressLine}>
            <View style={styles.progressFill} />
          </View>

          <TrackRow dot="done" title="Pedido confirmado" sub="14:52" />
          <TrackRow dot="prep" title="A preparar" sub="Tempo estimado: 25 min" />
          <TrackRow dot="idle" title="A caminho" sub="Aguardando estafeta" muted />
          <TrackRow dot="idle" title="Entregue" muted />
        </View>

        <View style={styles.trackDetailsCard}>
          <Text style={styles.sectionTitle}>Detalhes do pedido</Text>
          <SummaryLine label="1x Pizza Margherita" value={`EUR ${subtotal.toFixed(2)}`} />
          <SummaryLine label="Subtotal" value={`EUR ${subtotal.toFixed(2)}`} />
          <SummaryLine label="Taxa de entrega" value={`EUR ${deliveryFee.toFixed(2)}`} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>EUR {total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.trackDetailsCard}>
          <Text style={styles.sectionTitle}>Entregar em</Text>
          <View style={styles.addressRow}>
            <Text style={styles.addressPin}>{ICON.pin}</Text>
            <View>
              <Text style={styles.addressName}>Casa</Text>
              <Text style={styles.addressLine}>Rua das Flores, 123</Text>
              <Text style={styles.addressLine}>4000-205 Porto</Text>
            </View>
          </View>
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

function TrackRow({ dot, title, sub, muted }) {
  return (
    <View style={styles.trackRow}>
      <View style={[styles.trackDotCircle, dot === 'done' ? styles.dotDone : null, dot === 'prep' ? styles.dotPrep : null]} />
      <View>
        <Text style={[styles.trackRowTitle, muted ? styles.trackRowTitleMuted : null]}>{title}</Text>
        {sub ? <Text style={[styles.trackRowSub, muted ? styles.trackRowSubMuted : null]}>{sub}</Text> : null}
      </View>
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
  searchText: { color: '#9db8f8', fontSize: 15, fontWeight: '500' },

  scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 18 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginBottom: 12 },

  restaurantCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 2,
  },
  restaurantCover: {
    height: 122,
    backgroundColor: '#ff7900',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 44 },
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
  metaLine: { color: '#334155', fontSize: 13, marginTop: 7 },

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
  menuHeaderTitle: { color: '#ffffff', fontSize: 39, fontWeight: '900', marginTop: 4 },
  menuHeaderMeta: { color: '#ffefdf', fontSize: 14, marginTop: 6 },

  menuCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  menuThumb: {
    width: 78,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#ff7900',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuThumbEmoji: { fontSize: 38 },
  menuInfo: { flex: 1 },
  menuName: { color: '#0f172a', fontSize: 17, fontWeight: '800' },
  menuDescription: { color: '#64748b', fontSize: 14, marginTop: 2, lineHeight: 20 },
  menuPrice: { color: '#ff5f00', fontSize: 16, fontWeight: '900', marginTop: 5 },
  menuRate: { color: '#d4a200', fontSize: 12, marginTop: 2, fontWeight: '600' },
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
  totalLabel: { color: '#0f172a', fontSize: 32, fontWeight: '800' },
  totalValue: { color: '#0f172a', fontSize: 32, fontWeight: '800' },
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
  trackTitle: { color: '#ffffff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  trackSub: { color: '#dbe7ff', fontSize: 15, marginTop: 4 },

  trackCard: {
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  trackSummaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  prepDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prepIcon: { fontSize: 16, color: '#f97316' },
  trackSummaryTextWrap: { flex: 1 },
  trackSummaryTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800' },
  trackSummarySub: { color: '#64748b', fontSize: 14, marginTop: 2 },
  progressLine: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d6dce6',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: { width: '34%', height: '100%', backgroundColor: '#ff6900' },

  trackRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  trackDotCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginRight: 12,
    marginTop: 1,
  },
  dotDone: { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  dotPrep: { borderColor: '#fb923c', backgroundColor: '#fb923c' },
  trackRowTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  trackRowTitleMuted: { color: '#a3a9b4' },
  trackRowSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  trackRowSubMuted: { color: '#c0c6d2' },

  trackDetailsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#dfe4ec',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  addressRow: { flexDirection: 'row', marginTop: 4 },
  addressPin: { color: '#94a3b8', fontSize: 16, marginRight: 8, marginTop: 2 },
  addressName: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  addressLine: { color: '#64748b', fontSize: 14, marginTop: 1 },
})
