import { buildAuthHeaders, graphqlRequest } from './apiClient'

const RESTAURANTS_QUERY = `
  query Restaurants {
    restaurants {
      id
      name
      city
      rating
    }
  }
`

const RESTAURANT_MENU_QUERY = `
  query RestaurantMenu($restaurantId: ID!) {
    restaurantMenu(restaurant_id: $restaurantId) {
      restaurant_product_id
      name
      description
      price
      is_available
    }
  }
`

const MY_CART_QUERY = `
  query MyCart {
    myCart {
      id
      restaurant_id
      total
      items {
        id
        restaurant_product_id
        product_name
        quantity
        unit_price
        line_total
      }
    }
  }
`

const MY_ORDERS_QUERY = `
  query MyOrders($activeOnly: Boolean, $limit: Int) {
    myOrders(active_only: $activeOnly, limit: $limit) {
      id
      status
      total
      restaurant_name
      delivery_status
      payment_status
      created_at
    }
  }
`

const ORDER_TRACKING_QUERY = `
  query OrderTracking($orderId: ID!) {
    orderTracking(order_id: $orderId) {
      order_id
      order_status
      delivery_id
      delivery_status
      restaurant_name
      customer_name
      pickup_latitude
      pickup_longitude
      dropoff_latitude
      dropoff_longitude
      route_provider
      route_distance_km
      route_duration_seconds
      route_points {
        lat
        lng
      }
      distance_km_remaining
      eta_seconds
      latest_position {
        lat
        lng
        recorded_at
      }
      positions {
        lat
        lng
        recorded_at
      }
      events {
        event_type
        timestamp
      }
    }
  }
`

const UPDATE_COURIER_LOCATION_MUTATION = `
  mutation UpdateCourierLocation($input: UpdateCourierLocationInput!) {
    updateCourierLocation(input: $input) {
      ok
      delivery_id
      order_id
      recorded_at
    }
  }
`

const ADD_CART_ITEM_MUTATION = `
  mutation AddCartItem($input: AddCartItemInput!) {
    addCartItem(input: $input) {
      id
      restaurant_id
      total
      items {
        id
        restaurant_product_id
        product_name
        quantity
        unit_price
        line_total
      }
    }
  }
`

const UPDATE_CART_ITEM_MUTATION = `
  mutation UpdateCartItem($input: UpdateCartItemInput!) {
    updateCartItem(input: $input) {
      id
      restaurant_id
      total
      items {
        id
        restaurant_product_id
        product_name
        quantity
        unit_price
        line_total
      }
    }
  }
`

const REMOVE_CART_ITEM_MUTATION = `
  mutation RemoveCartItem($input: RemoveCartItemInput!) {
    removeCartItem(input: $input) {
      id
      restaurant_id
      total
      items {
        id
        restaurant_product_id
        product_name
        quantity
        unit_price
        line_total
      }
    }
  }
`

const CHECKOUT_MUTATION = `
  mutation Checkout($input: CheckoutInput!) {
    checkout(input: $input) {
      ok
      order_id
      payment_id
      order_status
      payment_status
      total
    }
  }
`

const TOGGLE_COURIER_AVAILABILITY_MUTATION = `
  mutation ToggleCourierAvailability($input: ToggleCourierAvailabilityInput!) {
    toggleCourierAvailability(input: $input) {
      ok
      courier_id
      status
    }
  }
`

const COURIER_AVAILABLE_DELIVERIES_QUERY = `
  query CourierAvailableDeliveries($limit: Int) {
    courierAvailableDeliveries(limit: $limit) {
      delivery_id
      order_id
      order_status
      restaurant_name
      order_total
      estimated_pickup_distance_km
      estimated_pickup_time_min
      pickup_address
      dropoff_address
      offer_token
      offer_expires_at
      created_at
    }
  }
`

const ACCEPT_DELIVERY_JOB_MUTATION = `
  mutation AcceptDeliveryJob($input: AcceptDeliveryJobInput!) {
    acceptDeliveryJob(input: $input) {
      ok
      delivery_id
      order_id
      courier_id
      delivery_status
    }
  }
`

const UPDATE_DELIVERY_STATUS_MUTATION = `
  mutation UpdateDeliveryStatus($input: UpdateDeliveryStatusInput!) {
    updateDeliveryStatus(input: $input) {
      ok
      delivery_id
      order_id
      delivery_status
      order_status
      recorded_at
    }
  }
`

function requestOptions(session) {
  return {
    headers: buildAuthHeaders({
      devUserId: session?.devUserId,
      token: session?.token,
    }),
  }
}

export async function fetchRestaurants(session) {
  const data = await graphqlRequest({
    query: RESTAURANTS_QUERY,
    ...requestOptions(session),
  })

  return data.restaurants ?? []
}

export async function fetchRestaurantMenu({ session, restaurantId }) {
  const data = await graphqlRequest({
    query: RESTAURANT_MENU_QUERY,
    variables: { restaurantId },
    ...requestOptions(session),
  })

  return data.restaurantMenu ?? []
}

export async function fetchMyCart(session) {
  const data = await graphqlRequest({
    query: MY_CART_QUERY,
    ...requestOptions(session),
  })

  return data.myCart
}

export async function addCartItem({ session, restaurantProductId, quantity = 1 }) {
  const data = await graphqlRequest({
    query: ADD_CART_ITEM_MUTATION,
    variables: {
      input: {
        restaurant_product_id: restaurantProductId,
        quantity,
      },
    },
    ...requestOptions(session),
  })

  return data.addCartItem
}

export async function updateCartItem({ session, cartItemId, quantity }) {
  const data = await graphqlRequest({
    query: UPDATE_CART_ITEM_MUTATION,
    variables: {
      input: {
        cart_item_id: cartItemId,
        quantity,
      },
    },
    ...requestOptions(session),
  })

  return data.updateCartItem
}

export async function removeCartItem({ session, cartItemId }) {
  const data = await graphqlRequest({
    query: REMOVE_CART_ITEM_MUTATION,
    variables: {
      input: {
        cart_item_id: cartItemId,
      },
    },
    ...requestOptions(session),
  })

  return data.removeCartItem
}

export async function checkoutCart(session, { couponCode = null } = {}) {
  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`

  const data = await graphqlRequest({
    query: CHECKOUT_MUTATION,
    variables: {
      input: {
        payment_method: 'CASH',
        coupon_code: couponCode,
      },
    },
    headers: {
      ...buildAuthHeaders({
        devUserId: session?.devUserId,
        token: session?.token,
      }),
      'Idempotency-Key': idempotencyKey,
    },
  })

  return data.checkout
}

export async function fetchMyOrders(session, { activeOnly = false, limit = 10 } = {}) {
  const data = await graphqlRequest({
    query: MY_ORDERS_QUERY,
    variables: { activeOnly, limit },
    ...requestOptions(session),
  })

  return data.myOrders ?? []
}

export async function fetchOrderTracking({ session, orderId }) {
  const data = await graphqlRequest({
    query: ORDER_TRACKING_QUERY,
    variables: { orderId },
    ...requestOptions(session),
  })

  return data.orderTracking
}

export async function toggleCourierAvailability({ session, status }) {
  const data = await graphqlRequest({
    query: TOGGLE_COURIER_AVAILABILITY_MUTATION,
    variables: {
      input: { status },
    },
    ...requestOptions(session),
  })

  return data.toggleCourierAvailability
}

export async function fetchCourierAvailableDeliveries(session, { limit = 20 } = {}) {
  const data = await graphqlRequest({
    query: COURIER_AVAILABLE_DELIVERIES_QUERY,
    variables: { limit },
    ...requestOptions(session),
  })

  return data.courierAvailableDeliveries ?? []
}

export async function acceptDeliveryJob({ session, deliveryId, offerToken }) {
  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`

  const data = await graphqlRequest({
    query: ACCEPT_DELIVERY_JOB_MUTATION,
    variables: {
      input: { delivery_id: deliveryId, offer_token: offerToken },
    },
    headers: {
      ...buildAuthHeaders({
        devUserId: session?.devUserId,
        token: session?.token,
      }),
      'Idempotency-Key': idempotencyKey,
    },
  })

  return data.acceptDeliveryJob
}

export async function updateDeliveryStatus({ session, deliveryId, status }) {
  const data = await graphqlRequest({
    query: UPDATE_DELIVERY_STATUS_MUTATION,
    variables: {
      input: {
        delivery_id: deliveryId,
        status,
      },
    },
    ...requestOptions(session),
  })

  return data.updateDeliveryStatus
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
        delivery_id: deliveryId,
        lat,
        lng,
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
