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
      is_default
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

export async function fetchRestaurants(session) {
  const data = await graphqlRequest({
    query: RESTAURANTS_QUERY,
    ...requestOptions(session),
  })

  return (data.restaurants ?? []).map(mapRestaurant)
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

export async function addCartItem({ session, restaurantProductId, quantity = 1 }) {
  const data = await graphqlRequest({
    query: ADD_CART_ITEM_MUTATION,
    variables: {
      input: {
        user_id: sessionUserId(session),
        restaurant_product_id: restaurantProductId,
        quantity,
        option_ids: [],
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

export async function checkoutCart(session, { couponCode = null } = {}) {
  const addressId = session?.addressId ?? await fetchDefaultAddressId(session)

  const data = await graphqlRequest({
    query: CHECKOUT_MUTATION,
    variables: {
      input: {
        user_id: sessionUserId(session),
        address_id: addressId,
        payment_method: 'CASH',
        coupon_code: couponCode,
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
