import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { RealtimeTopicsCard } from '../../components/realtime/RealtimeTopicsCard'
import { NativeDeliveryMapCard } from '../../components/maps/NativeDeliveryMapCard'
import { styles } from './styles'
import {
  CANCELLABLE_STATUSES,
  TRACKABLE_STATUSES,
  ICON,
  formatCurrency,
  orderStatusChipStyle,
  paymentMethodLabel,
  statusLabel,
} from './utils'

export function HomeScreen({
  restaurants,
  loading,
  isOnline,
  pushStatus,
  notificationState,
  notificationPreview,
  availableCouriers,
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
  const noCouriersAvailable = availableCouriers === 0
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

        {noCouriersAvailable ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Sem estafetas disponiveis neste momento. Nao e possivel fazer pedidos.
            </Text>
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
              <Text style={styles.coverEmoji}>{'\u{1F355}'}</Text>
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

export function MenuScreen({
  restaurant,
  items,
  itemCount,
  total,
  loading,
  availableCouriers,
  onBack,
  onAdd,
  onOpenCart,
  activeCategory,
  onChangeCategory,
}) {
  const noCouriersAvailable = availableCouriers === 0
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

      {noCouriersAvailable ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Sem estafetas disponiveis. Nao e possivel finalizar pedido neste momento.
          </Text>
        </View>
      ) : null}

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
                  <Text style={styles.menuThumbEmoji}>{'\u{1F355}'}</Text>
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

export function CartScreen({
  items,
  subtotal,
  deliveryFee,
  total,
  loading,
  availableCouriers,
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
  const noCouriersAvailable = availableCouriers === 0
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, styles.cartScroll]}
        showsVerticalScrollIndicator={false}
      >
        {noCouriersAvailable ? (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineBannerText}>
              Sem estafetas disponiveis. Nao podes finalizar o pedido agora.
            </Text>
          </View>
        ) : null}

        {items.length === 0 ? <Text style={styles.mutedText}>Carrinho vazio.</Text> : null}

        {items.map((item) => (
          <View style={styles.cartCard} key={item.id}>
            <View style={styles.menuThumb}>
              <Text style={styles.menuThumbEmoji}>{'\u{1F355}'}</Text>
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

        <Pressable
          style={styles.orderButton}
          onPress={onPlaceOrder}
          disabled={loading || items.length === 0 || noCouriersAvailable}
        >
          <Text style={styles.orderButtonText}>
            {loading
              ? 'A processar...'
              : noCouriersAvailable
                ? 'Sem estafetas disponiveis'
                : 'Fazer Pedido'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

export function TrackingScreen({
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

export function SummaryLine({ label, value }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}


export function OrdersHistoryScreen({
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

export function ProfileScreen({
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
