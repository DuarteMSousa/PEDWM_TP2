import { buildAuthHeaders, graphqlRequest } from './apiClient'

const ACTIVE_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']

function sessionUserId(session) {
  return session?.userId || session?.devUserId
}

function requestOptions(session) {
  return {
    headers: buildAuthHeaders({
      devUserId: session?.devUserId,
      token: session?.token,
    }),
  }
}

function mapRestaurant(restaurant) {
  const ratingCount = Number(restaurant?.rating_count ?? 0)
  return {
    id: restaurant.id,
    name: restaurant.name,
    city: restaurant.address?.city ?? '',
    rating: ratingCount > 0 ? Number(restaurant.rating_sum ?? 0) / ratingCount : 0,
  }
}

function mapMenuProduct(item, categories = []) {
  const category = categories.find((entry) => entry.id === item.product?.category_id)
  return {
    restaurant_product_id: item.id,
    product_id: item.product_id,
    category: category?.name ?? '',
    name: item.product?.name ?? 'Produto',
    description: item.product?.description ?? '',
    price: item.local_price ?? item.product?.price ?? 0,
    is_available: Boolean(item.is_available),
    estimated_preparation_time_min: item.estimated_preparation_time_min,
  }
}

function mapCart(cart) {
  if (!cart) return null

  return {
    id: cart.id,
    total: cart.total,
    items: (cart.items ?? []).map((item) => ({
      id: item.id,
      restaurant_product_id: item.restaurant_product_id,
      product_name: item.restaurantProduct?.product?.name ?? 'Produto',
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.total_price,
    })),
  }
}

function mapOrderSummary(order) {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    restaurant_name: order.restaurant_name_snapshot,
    delivery_status: order.delivery?.status ?? null,
    payment_status: order.payment?.status ?? null,
    created_at: order.created_at,
  }
}

function mapPosition(position) {
  if (!position) return null

  return {
    lat: Number(position.latitude),
    lng: Number(position.longitude),
    recorded_at: position.timestamp,
  }
}

function mapTracking(payload) {
  const order = payload?.order
  const delivery = payload?.delivery
  const positions = (delivery?.positionHistory ?? []).map(mapPosition).filter(Boolean).reverse()
  const lastPosition = mapPosition(payload?.last_position) ?? positions[0] ?? null

  return {
    order_id: order?.id ?? null,
    order_status: order?.status ?? null,
    delivery_id: delivery?.id ?? null,
    delivery_status: delivery?.status ?? null,
    courier_id: delivery?.courier_id ?? payload?.courier?.user_id ?? null,
    restaurant_name: order?.restaurant_name_snapshot ?? '',
    customer_name: order?.user?.name ?? '',
    pickup_latitude: order?.restaurant?.address?.latitude ?? null,
    pickup_longitude: order?.restaurant?.address?.longitude ?? null,
    dropoff_latitude: order?.address?.latitude ?? null,
    dropoff_longitude: order?.address?.longitude ?? null,
    route_provider: 'backend',
    route_distance_km: null,
    route_duration_seconds: null,
    route_points: [],
    distance_km_remaining: null,
    eta_seconds: payload?.eta_seconds ?? null,
    latest_position: lastPosition,
    positions,
    events: order?.events ?? [],
  }
}

const RESTAURANTS_QUERY = `
  query Restaurants {
    restaurants {
      id
      name
      rating_sum
      rating_count
      address { city }
    }
  }
`

const PRODUCT_OPTION_GROUPS_QUERY = `
  query ProductOptionGroups($productId: ID!) {
    productOptionGroups(product_id: $productId) {
      id
      name
      min_options
      max_options
      options {
        id
        name
        extra_price
        default_option
      }
    }
  }
`

const RESTAURANT_MENU_QUERY = `
  query RestaurantMenu($restaurantId: ID!) {
    restaurantMenu(restaurant_id: $restaurantId) {
      categories { id name }
      products {
        id
        restaurant_id
        product_id
        local_price
        is_available
        estimated_preparation_time_min
        product {
          id
          category_id
          name
          price
          description
        }
      }
    }
  }
`

const CART_QUERY = `
  query ClientCart($userId: ID!) {
    clientCart(user_id: $userId) {
      id
      total
      items {
        id
        restaurant_product_id
        quantity
        unit_price
        total_price
        restaurantProduct {
          product { name }
        }
      }
    }
  }
`

const CLIENT_ADDRESSES_QUERY = `
  query ClientAddresses($userId: ID!) {
    clientAddresses(user_id: $userId) {
      id
      label
      street
      city
      postal_code
      country
      latitude
      longitude
      is_default
    }
  }
`

const CREATE_CLIENT_ADDRESS_MUTATION = `
  mutation CreateClientAddress($userId: ID!, $input: CreateUserAddressInput!) {
    createClientAddress(user_id: $userId, input: $input) {
      id
      label
      street
      city
      postal_code
      country
      latitude
      longitude
      is_default
    }
  }
`

const UPDATE_CLIENT_ADDRESS_MUTATION = `
  mutation UpdateClientAddress($userId: ID!, $addressId: ID!, $input: UpdateUserAddressInput!) {
    updateClientAddress(user_id: $userId, address_id: $addressId, input: $input) {
      id
      label
      street
      city
      postal_code
      country
      latitude
      longitude
      is_default
    }
  }
`

const DELETE_CLIENT_ADDRESS_MUTATION = `
  mutation DeleteClientAddress($userId: ID!, $addressId: ID!) {
    deleteClientAddress(user_id: $userId, address_id: $addressId)
  }
`

const SET_DEFAULT_CLIENT_ADDRESS_MUTATION = `
  mutation SetDefaultClientAddress($userId: ID!, $addressId: ID!) {
    setDefaultClientAddress(user_id: $userId, address_id: $addressId) {
      id
      is_default
    }
  }
`

const COUPON_BY_CODE_QUERY = `
  query CouponByCode($code: String!) {
    couponByCode(code: $code) {
      id
      code
      description
      type
      target
      expiry_date
    }
  }
`

const ORDERS_QUERY = `
  query ClientOrders($userId: ID!, $statuses: [OrderStatus!], $perPage: Int) {
    clientOrders(user_id: $userId, statuses: $statuses, per_page: $perPage) {
      id
      status
      total
      restaurant_name_snapshot
      created_at
      payment { status }
      delivery { id status }
    }
  }
`

const ORDERS_HISTORY_QUERY = `
  query ClientOrdersHistory($userId: ID!, $statuses: [OrderStatus!], $perPage: Int) {
    clientOrders(user_id: $userId, statuses: $statuses, per_page: $perPage) {
      id
      restaurant_id
      status
      total
      restaurant_name_snapshot
      created_at
      updated_at
      payment { status method }
      delivery { id status courier_id }
      items {
        id
        quantity
        product_name_snapshot
        total_price
      }
      address { street city }
    }
  }
`

const CANCEL_CLIENT_ORDER_MUTATION = `
  mutation CancelClientOrder($userId: ID!, $orderId: ID!, $reason: String) {
    cancelClientOrder(user_id: $userId, order_id: $orderId, reason: $reason) {
      id
      status
    }
  }
`

const REPEAT_CLIENT_ORDER_MUTATION = `
  mutation RepeatClientOrder($userId: ID!, $orderId: ID!) {
    repeatClientOrder(user_id: $userId, order_id: $orderId) {
      id
      total
      items {
        id
        restaurant_product_id
        quantity
        unit_price
        total_price
        restaurantProduct { product { name } }
      }
    }
  }
`

const ORDER_TRACKING_QUERY = `
  query OrderTracking($userId: ID!, $orderId: ID!) {
    orderTracking(user_id: $userId, order_id: $orderId) {
      eta_seconds
      last_position { latitude longitude timestamp }
      courier { user_id }
      order {
        id
        status
        total
        restaurant_name_snapshot
        user { name }
        address { latitude longitude }
        restaurant { address { latitude longitude } }
        events { event_type timestamp }
      }
      delivery {
        id
        courier_id
        status
        positionHistory { latitude longitude timestamp }
      }
    }
  }
`

const COURIER_DELIVERIES_QUERY = `
  query CourierDeliveries($courierId: ID!, $statuses: [DeliveryStatus!]) {
    courierDeliveries(courier_id: $courierId, statuses: $statuses) {
      id
      order_id
      status
      pickup_time
      delivery_time
      delivery_fee
      order {
        id
        total
        restaurant_name_snapshot
        created_at
        address { street city }
      }
    }
  }
`

const COURIER_OFFERS_QUERY = `
  query CourierOffers($courierId: ID!) {
    courierDeliveryOffers(courier_id: $courierId) {
      id
      expires_at
      delivery {
        id
        order_id
        status
        order {
          id
          status
          total
          restaurant_name_snapshot
          address { street city }
          restaurant { address { street city } }
        }
      }
    }
  }
`

const ADD_CART_ITEM_MUTATION = `
  mutation AddCartItem($input: AddCartItemInput!) {
    addClientCartItem(input: $input) {
      id
      total
      items {
        id
        restaurant_product_id
        quantity
        unit_price
        total_price
        restaurantProduct { product { name } }
      }
    }
  }
`

const UPDATE_CART_ITEM_MUTATION = `
  mutation UpdateCartItem($cartItemId: ID!, $input: UpdateCartItemInput!) {
    updateClientCartItem(cart_item_id: $cartItemId, input: $input) {
      id
      total
      items {
        id
        restaurant_product_id
        quantity
        unit_price
        total_price
        restaurantProduct { product { name } }
      }
    }
  }
`

const REMOVE_CART_ITEM_MUTATION = `
  mutation RemoveCartItem($userId: ID!, $cartItemId: ID!) {
    removeClientCartItem(user_id: $userId, cart_item_id: $cartItemId) {
      id
      total
      items {
        id
        restaurant_product_id
        quantity
        unit_price
        total_price
        restaurantProduct { product { name } }
      }
    }
  }
`

const ORDER_CHATS_QUERY = `
  query OrderChats($orderId: ID!) {
    orderChats(order_id: $orderId) {
      id
      order_id
      type
      closed_at
      messages {
        id
        sender_participant_id
        content
        timestamp
        read_at
      }
      participants {
        id
        user_id
        user_type
      }
    }
  }
`

const CHAT_MESSAGES_QUERY = `
  query ChatMessages($chatId: ID!, $perPage: Int) {
    chatMessages(chat_id: $chatId, per_page: $perPage) {
      id
      chat_id
      sender_participant_id
      content
      timestamp
      read_at
    }
  }
`

const CREATE_ORDER_CHAT_MUTATION = `
  mutation CreateOrderChat($input: CreateOrderChatInput!) {
    createOrderChat(input: $input) {
      id
      order_id
      type
      messages {
        id
        sender_participant_id
        content
        timestamp
      }
    }
  }
`

const SEND_MESSAGE_MUTATION = `
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
      id
      chat_id
      sender_participant_id
      content
      timestamp
    }
  }
`

const MARK_CHAT_READ_MUTATION = `
  mutation MarkChatAsRead($chatId: ID!, $userId: ID!) {
    markChatAsRead(chat_id: $chatId, user_id: $userId) {
      id
      last_read_at
    }
  }
`

const CREATE_REVIEW_MUTATION = `
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      comment
      target_type
      target_id
      created_at
    }
  }
`

const UPDATE_USER_MUTATION = `
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      name
      email
    }
  }
`

const PAY_PAYMENT_MUTATION = `
  mutation PayPayment($paymentId: ID!, $transactionId: String) {
    payPayment(payment_id: $paymentId, transaction_id: $transactionId) {
      id
      status
      method
      transaction_id
      paid_at
    }
  }
`

const ORDER_PAYMENT_QUERY = `
  query OrderPayment($orderId: ID!) {
    orderPayment(order_id: $orderId) {
      id
      status
      method
      transaction_id
      paid_at
      expired_at
      amount
    }
  }
`

const CHECKOUT_MUTATION = `
  mutation Checkout($input: CheckoutInput!) {
    checkout(input: $input) {
      order {
        id
        status
        total
      }
      payment {
        id
        status
        method
      }
    }
  }
`

const SET_COURIER_STATUS_MUTATION = `
  mutation SetCourierStatus($userId: ID!, $status: CourierStatus!) {
    setCourierStatus(user_id: $userId, status: $status) {
      user_id
      status
    }
  }
`

const ACCEPT_DELIVERY_OFFER_MUTATION = `
  mutation AcceptDeliveryOffer($offerId: ID!) {
    acceptDeliveryOffer(offer_id: $offerId) {
      id
      order_id
      courier_id
      status
    }
  }
`

const REJECT_DELIVERY_OFFER_MUTATION = `
  mutation RejectDeliveryOffer($offerId: ID!, $reason: String) {
    rejectDeliveryOffer(offer_id: $offerId, reason: $reason)
  }
`

const DELIVERY_STATUS_MUTATIONS = {
  PICKED_UP: `
    mutation MarkPickedUp($deliveryId: ID!, $courierId: ID!) {
      markDeliveryPickedUp(delivery_id: $deliveryId, courier_id: $courierId) {
        id
        order_id
        status
        order { status }
      }
    }
  `,
  IN_TRANSIT: `
    mutation MarkInTransit($deliveryId: ID!, $courierId: ID!) {
      markDeliveryInTransit(delivery_id: $deliveryId, courier_id: $courierId) {
        id
        order_id
        status
        order { status }
      }
    }
  `,
  DELIVERED: `
    mutation MarkDelivered($deliveryId: ID!, $courierId: ID!) {
      markDeliveryDelivered(delivery_id: $deliveryId, courier_id: $courierId) {
        id
        order_id
        status
        order { status }
      }
    }
  `,
}

const UPDATE_COURIER_LOCATION_MUTATION = `
  mutation UpdateCourierLocation($input: UpdateCourierLocationInput!) {
    updateCourierLocation(input: $input) {
      ok
      delivery_id
      recorded_at
    }
  }
`

const CLIENT_NOTIFICATIONS_QUERY = `
  query ClientNotifications($userId: ID!, $unreadOnly: Boolean!, $limit: Int!) {
    clientNotifications(user_id: $userId, unread_only: $unreadOnly, limit: $limit) {
      id
      type
      title
      message
      sent_at
      read_at
    }
  }
`

const MARK_NOTIFICATION_READ_MUTATION = `
  mutation MarkNotificationRead($userId: ID!, $notificationId: ID!) {
    markNotificationRead(user_id: $userId, notification_id: $notificationId) {
      ok
      notification_id
      read_at
    }
  }
`

const MARK_ALL_NOTIFICATIONS_READ_MUTATION = `
  mutation MarkAllClientNotificationsRead($userId: ID!) {
    markAllClientNotificationsRead(user_id: $userId) {
      ok
      affected_count
    }
  }
`

const MARK_DELIVERY_FAILED_MUTATION = `
  mutation MarkDeliveryFailed($deliveryId: ID!, $courierId: ID!, $reason: String!) {
    markDeliveryFailed(delivery_id: $deliveryId, courier_id: $courierId, reason: $reason) {
      id
      order_id
      status
      order { status }
    }
  }
`

export async function fetchRestaurants(session) {
  const data = await graphqlRequest({
    query: RESTAURANTS_QUERY,
    ...requestOptions(session),
  })

  return (data.restaurants ?? []).map(mapRestaurant)
}

export async function fetchProductOptionGroups({ session, productId }) {
  const data = await graphqlRequest({
    query: PRODUCT_OPTION_GROUPS_QUERY,
    variables: { productId },
    ...requestOptions(session),
  })

  return (data.productOptionGroups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    min_options: Number(group.min_options ?? 0),
    max_options: Number(group.max_options ?? 1),
    options: (group.options ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      extra_price: Number(option.extra_price ?? 0),
      default_option: Boolean(option.default_option),
    })),
  }))
}

export async function fetchRestaurantMenu({ session, restaurantId }) {
  const data = await graphqlRequest({
    query: RESTAURANT_MENU_QUERY,
    variables: { restaurantId },
    ...requestOptions(session),
  })

  return (data.restaurantMenu?.products ?? []).map((item) =>
    mapMenuProduct(item, data.restaurantMenu?.categories ?? []),
  )
}

export async function fetchMyCart(session) {
  const userId = sessionUserId(session)
  const data = await graphqlRequest({
    query: CART_QUERY,
    variables: { userId },
    ...requestOptions(session),
  })

  return mapCart(data.clientCart)
}

function mapAddress(address) {
  if (!address) return null
  return {
    id: address.id,
    label: address.label ?? null,
    street: address.street,
    city: address.city,
    postal_code: address.postal_code,
    country: address.country,
    latitude: Number(address.latitude),
    longitude: Number(address.longitude),
    is_default: Boolean(address.is_default),
  }
}

export async function fetchClientAddresses(session) {
  const data = await graphqlRequest({
    query: CLIENT_ADDRESSES_QUERY,
    variables: { userId: sessionUserId(session) },
    ...requestOptions(session),
  })

  return (data.clientAddresses ?? []).map(mapAddress)
}

export async function createClientAddress({ session, input }) {
  const data = await graphqlRequest({
    query: CREATE_CLIENT_ADDRESS_MUTATION,
    variables: {
      userId: sessionUserId(session),
      input: {
        street: input.street,
        city: input.city,
        postal_code: input.postal_code,
        country: input.country,
        latitude: Number(input.latitude),
        longitude: Number(input.longitude),
        label: input.label ?? null,
        is_default: Boolean(input.is_default),
      },
    },
    ...requestOptions(session),
  })

  return mapAddress(data.createClientAddress)
}

export async function updateClientAddress({ session, addressId, input }) {
  const data = await graphqlRequest({
    query: UPDATE_CLIENT_ADDRESS_MUTATION,
    variables: {
      userId: sessionUserId(session),
      addressId,
      input,
    },
    ...requestOptions(session),
  })

  return mapAddress(data.updateClientAddress)
}

export async function deleteClientAddress({ session, addressId }) {
  const data = await graphqlRequest({
    query: DELETE_CLIENT_ADDRESS_MUTATION,
    variables: {
      userId: sessionUserId(session),
      addressId,
    },
    ...requestOptions(session),
  })

  return { ok: Boolean(data.deleteClientAddress) }
}

export async function setDefaultClientAddress({ session, addressId }) {
  const data = await graphqlRequest({
    query: SET_DEFAULT_CLIENT_ADDRESS_MUTATION,
    variables: {
      userId: sessionUserId(session),
      addressId,
    },
    ...requestOptions(session),
  })

  return { ok: true, id: data.setDefaultClientAddress.id }
}

export async function fetchOrderChats({ session, orderId }) {
  const data = await graphqlRequest({
    query: ORDER_CHATS_QUERY,
    variables: { orderId },
    ...requestOptions(session),
  })

  return (data.orderChats ?? []).map((chat) => ({
    id: chat.id,
    order_id: chat.order_id,
    type: chat.type,
    closed_at: chat.closed_at,
    messages: chat.messages ?? [],
    participants: chat.participants ?? [],
  }))
}

export async function fetchChatMessages({ session, chatId, limit = 50 }) {
  const data = await graphqlRequest({
    query: CHAT_MESSAGES_QUERY,
    variables: { chatId, perPage: limit },
    ...requestOptions(session),
  })

  return data.chatMessages ?? []
}

export async function createOrderChat({ session, orderId, type, participantUserIds }) {
  const data = await graphqlRequest({
    query: CREATE_ORDER_CHAT_MUTATION,
    variables: {
      input: {
        order_id: orderId,
        type,
        participant_user_ids: participantUserIds,
      },
    },
    ...requestOptions(session),
  })

  return data.createOrderChat
}

export async function sendChatMessage({ session, chatId, content }) {
  const trimmed = String(content ?? '').trim()
  if (!trimmed) {
    throw new Error('A mensagem nao pode ser vazia.')
  }

  const data = await graphqlRequest({
    query: SEND_MESSAGE_MUTATION,
    variables: {
      input: {
        chat_id: chatId,
        sender_user_id: sessionUserId(session),
        content: trimmed,
      },
    },
    ...requestOptions(session),
  })

  return data.sendMessage
}

export async function markChatRead({ session, chatId }) {
  const data = await graphqlRequest({
    query: MARK_CHAT_READ_MUTATION,
    variables: { chatId, userId: sessionUserId(session) },
    ...requestOptions(session),
  })

  return data.markChatAsRead
}

export async function createClientReview({ session, rating, comment = null, targetType, targetId }) {
  if (rating < 1 || rating > 5) {
    throw new Error('A avaliacao deve estar entre 1 e 5.')
  }

  const data = await graphqlRequest({
    query: CREATE_REVIEW_MUTATION,
    variables: {
      input: {
        user_id: sessionUserId(session),
        rating,
        comment: comment && comment.trim() !== '' ? comment.trim() : null,
        target_type: targetType,
        target_id: targetId,
      },
    },
    ...requestOptions(session),
  })

  return data.createReview
}

export async function updateClientUser({ session, name = null, email = null }) {
  const input = {}
  if (name && name.trim() !== '') input.name = name.trim()
  if (email && email.trim() !== '') input.email = email.trim()

  if (Object.keys(input).length === 0) {
    throw new Error('Sem alteracoes para guardar.')
  }

  const data = await graphqlRequest({
    query: UPDATE_USER_MUTATION,
    variables: {
      id: sessionUserId(session),
      input,
    },
    ...requestOptions(session),
  })

  return data.updateUser
}

export async function fetchOrderPayment({ session, orderId }) {
  const data = await graphqlRequest({
    query: ORDER_PAYMENT_QUERY,
    variables: { orderId },
    ...requestOptions(session),
  })

  return data.orderPayment
}

export async function payPaymentNow({ session, paymentId, transactionId = null }) {
  const data = await graphqlRequest({
    query: PAY_PAYMENT_MUTATION,
    variables: {
      paymentId,
      transactionId: transactionId ?? `sim-${Date.now()}`,
    },
    ...requestOptions(session),
  })

  return data.payPayment
}

export async function fetchCouponByCode({ session, code }) {
  const data = await graphqlRequest({
    query: COUPON_BY_CODE_QUERY,
    variables: { code },
    ...requestOptions(session),
  })

  return data.couponByCode
}

async function fetchDefaultAddressId(session) {
  const userId = sessionUserId(session)
  const data = await graphqlRequest({
    query: CLIENT_ADDRESSES_QUERY,
    variables: { userId },
    ...requestOptions(session),
  })

  const addresses = data.clientAddresses ?? []
  return addresses.find((address) => address.is_default)?.id ?? addresses[0]?.id ?? null
}

export async function addCartItem({
  session,
  restaurantProductId,
  quantity = 1,
  optionIds = [],
}) {
  const data = await graphqlRequest({
    query: ADD_CART_ITEM_MUTATION,
    variables: {
      input: {
        user_id: sessionUserId(session),
        restaurant_product_id: restaurantProductId,
        quantity,
        option_ids: optionIds,
      },
    },
    ...requestOptions(session),
  })

  return mapCart(data.addClientCartItem)
}

export async function updateCartItem({ session, cartItemId, quantity }) {
  const data = await graphqlRequest({
    query: UPDATE_CART_ITEM_MUTATION,
    variables: {
      cartItemId,
      input: {
        user_id: sessionUserId(session),
        quantity,
      },
    },
    ...requestOptions(session),
  })

  return mapCart(data.updateClientCartItem)
}

export async function removeCartItem({ session, cartItemId }) {
  const data = await graphqlRequest({
    query: REMOVE_CART_ITEM_MUTATION,
    variables: {
      userId: sessionUserId(session),
      cartItemId,
    },
    ...requestOptions(session),
  })

  return mapCart(data.removeClientCartItem)
}

export async function checkoutCart(
  session,
  { addressId = null, paymentMethod = 'CASH', couponCode = null } = {},
) {
  const resolvedAddressId = addressId ?? session?.addressId ?? (await fetchDefaultAddressId(session))

  const data = await graphqlRequest({
    query: CHECKOUT_MUTATION,
    variables: {
      input: {
        user_id: sessionUserId(session),
        address_id: resolvedAddressId,
        payment_method: paymentMethod,
        coupon_code: couponCode && couponCode.trim() !== '' ? couponCode.trim() : null,
      },
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    order_id: data.checkout.order.id,
    payment_id: data.checkout.payment?.id ?? null,
    order_status: data.checkout.order.status,
    payment_status: data.checkout.payment?.status ?? null,
    payment_method: data.checkout.payment?.method ?? paymentMethod,
    total: data.checkout.order.total,
  }
}

export async function fetchMyOrders(session, { activeOnly = false, limit = 10 } = {}) {
  const data = await graphqlRequest({
    query: ORDERS_QUERY,
    variables: {
      userId: sessionUserId(session),
      statuses: activeOnly ? ACTIVE_ORDER_STATUSES : null,
      perPage: limit,
    },
    ...requestOptions(session),
  })

  return (data.clientOrders ?? []).map(mapOrderSummary)
}

export async function fetchClientOrdersHistory({ session, statuses = null, limit = 30 } = {}) {
  const data = await graphqlRequest({
    query: ORDERS_HISTORY_QUERY,
    variables: {
      userId: sessionUserId(session),
      statuses,
      perPage: limit,
    },
    ...requestOptions(session),
  })

  return (data.clientOrders ?? []).map((order) => ({
    id: order.id,
    restaurant_id: order.restaurant_id,
    status: order.status,
    total: Number(order.total ?? 0),
    restaurant_name: order.restaurant_name_snapshot,
    created_at: order.created_at,
    updated_at: order.updated_at,
    payment_status: order.payment?.status ?? null,
    payment_method: order.payment?.method ?? null,
    delivery_id: order.delivery?.id ?? null,
    delivery_status: order.delivery?.status ?? null,
    courier_id: order.delivery?.courier_id ?? null,
    items_summary: (order.items ?? [])
      .map((item) => `${item.quantity}x ${item.product_name_snapshot}`)
      .join(', '),
    items_count: (order.items ?? []).length,
    address: order.address
      ? `${order.address.street}, ${order.address.city}`
      : null,
  }))
}

export async function cancelClientOrderById({ session, orderId, reason = null }) {
  const data = await graphqlRequest({
    query: CANCEL_CLIENT_ORDER_MUTATION,
    variables: {
      userId: sessionUserId(session),
      orderId,
      reason: reason && reason.trim() !== '' ? reason.trim() : null,
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    order_id: data.cancelClientOrder.id,
    order_status: data.cancelClientOrder.status,
  }
}

export async function repeatClientOrderToCart({ session, orderId }) {
  const data = await graphqlRequest({
    query: REPEAT_CLIENT_ORDER_MUTATION,
    variables: {
      userId: sessionUserId(session),
      orderId,
    },
    ...requestOptions(session),
  })

  return mapCart(data.repeatClientOrder)
}

export async function fetchOrderTracking({ session, orderId }) {
  const data = await graphqlRequest({
    query: ORDER_TRACKING_QUERY,
    variables: {
      userId: sessionUserId(session),
      orderId,
    },
    ...requestOptions(session),
  })

  return mapTracking(data.orderTracking)
}

export async function toggleCourierAvailability({ session, status }) {
  const data = await graphqlRequest({
    query: SET_COURIER_STATUS_MUTATION,
    variables: {
      userId: sessionUserId(session),
      status,
    },
    ...requestOptions(session),
  })

  return data.setCourierStatus
}

export async function fetchCourierDeliveriesHistory({
  session,
  statuses = ['DELIVERED', 'FAILED'],
} = {}) {
  const courierId = sessionUserId(session)
  const data = await graphqlRequest({
    query: COURIER_DELIVERIES_QUERY,
    variables: { courierId, statuses },
    ...requestOptions(session),
  })

  return (data.courierDeliveries ?? []).map((delivery) => ({
    delivery_id: delivery.id,
    order_id: delivery.order_id,
    delivery_status: delivery.status,
    pickup_time: delivery.pickup_time,
    delivery_time: delivery.delivery_time,
    delivery_fee: Number(delivery.delivery_fee ?? 0),
    order_total: Number(delivery.order?.total ?? 0),
    restaurant_name: delivery.order?.restaurant_name_snapshot ?? '-',
    dropoff_address: delivery.order?.address
      ? `${delivery.order.address.street}, ${delivery.order.address.city}`
      : '-',
    order_created_at: delivery.order?.created_at,
  }))
}

export async function fetchCourierAvailableDeliveries(session) {
  const courierId = sessionUserId(session)
  const data = await graphqlRequest({
    query: COURIER_OFFERS_QUERY,
    variables: { courierId },
    ...requestOptions(session),
  })

  return (data.courierDeliveryOffers ?? []).map((offer) => ({
    delivery_id: offer.delivery?.id,
    offer_token: offer.id,
    order_id: offer.delivery?.order_id,
    order_status: offer.delivery?.order?.status,
    restaurant_name: offer.delivery?.order?.restaurant_name_snapshot,
    order_total: offer.delivery?.order?.total,
    estimated_pickup_distance_km: null,
    estimated_pickup_time_min: null,
    pickup_address: offer.delivery?.order?.restaurant?.address?.street ?? '-',
    dropoff_address: offer.delivery?.order?.address?.street ?? '-',
    offer_expires_at: offer.expires_at,
  }))
}

export async function acceptDeliveryJob({ session, offerToken }) {
  const data = await graphqlRequest({
    query: ACCEPT_DELIVERY_OFFER_MUTATION,
    variables: { offerId: offerToken },
    ...requestOptions(session),
  })

  return {
    ok: true,
    delivery_id: data.acceptDeliveryOffer.id,
    order_id: data.acceptDeliveryOffer.order_id,
    courier_id: data.acceptDeliveryOffer.courier_id,
    delivery_status: data.acceptDeliveryOffer.status,
  }
}

export async function rejectDeliveryJob({ session, offerToken, reason = null }) {
  const data = await graphqlRequest({
    query: REJECT_DELIVERY_OFFER_MUTATION,
    variables: { offerId: offerToken, reason },
    ...requestOptions(session),
  })

  return { ok: Boolean(data.rejectDeliveryOffer) }
}

export async function updateDeliveryStatus({ session, deliveryId, status }) {
  const query = DELIVERY_STATUS_MUTATIONS[status]
  if (!query) {
    throw new Error(`Estado de entrega nao suportado: ${status}`)
  }

  const operationName = status === 'PICKED_UP'
    ? 'markDeliveryPickedUp'
    : status === 'IN_TRANSIT'
      ? 'markDeliveryInTransit'
      : 'markDeliveryDelivered'

  const data = await graphqlRequest({
    query,
    variables: {
      deliveryId,
      courierId: sessionUserId(session),
    },
    ...requestOptions(session),
  })

  const delivery = data[operationName]
  return {
    ok: true,
    delivery_id: delivery.id,
    order_id: delivery.order_id,
    delivery_status: delivery.status,
    order_status: delivery.order?.status ?? null,
    recorded_at: new Date().toISOString(),
  }
}

export async function updateCourierLocation({
  session,
  deliveryId,
  lat,
  lng,
  heading = null,
  speed = null,
  accuracy = null,
  recordedAt = null,
}) {
  const data = await graphqlRequest({
    query: UPDATE_COURIER_LOCATION_MUTATION,
    variables: {
      input: {
        courier_id: sessionUserId(session),
        delivery_id: deliveryId,
        latitude: lat,
        longitude: lng,
        heading,
        speed,
        accuracy,
        recorded_at: recordedAt,
      },
    },
    ...requestOptions(session),
  })

  return data.updateCourierLocation
}

export async function fetchClientNotifications({
  session,
  unreadOnly = false,
  limit = 50,
} = {}) {
  const data = await graphqlRequest({
    query: CLIENT_NOTIFICATIONS_QUERY,
    variables: {
      userId: sessionUserId(session),
      unreadOnly,
      limit,
    },
    ...requestOptions(session),
  })

  return (data.clientNotifications ?? []).map((notification) => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    sent_at: notification.sent_at,
    read_at: notification.read_at,
    read: Boolean(notification.read_at),
  }))
}

export async function markClientNotificationRead({ session, notificationId }) {
  const data = await graphqlRequest({
    query: MARK_NOTIFICATION_READ_MUTATION,
    variables: {
      userId: sessionUserId(session),
      notificationId,
    },
    ...requestOptions(session),
  })

  return data.markNotificationRead
}

export async function markAllClientNotificationsRead({ session }) {
  const data = await graphqlRequest({
    query: MARK_ALL_NOTIFICATIONS_READ_MUTATION,
    variables: {
      userId: sessionUserId(session),
    },
    ...requestOptions(session),
  })

  return data.markAllClientNotificationsRead
}

export async function markDeliveryFailed({ session, deliveryId, reason }) {
  const trimmedReason = String(reason ?? '').trim()
  if (!trimmedReason) {
    throw new Error('Motivo da falha e obrigatorio.')
  }

  const data = await graphqlRequest({
    query: MARK_DELIVERY_FAILED_MUTATION,
    variables: {
      deliveryId,
      courierId: sessionUserId(session),
      reason: trimmedReason,
    },
    ...requestOptions(session),
  })

  const delivery = data.markDeliveryFailed
  return {
    ok: true,
    delivery_id: delivery.id,
    order_id: delivery.order_id,
    delivery_status: delivery.status,
    order_status: delivery.order?.status ?? null,
  }
}
