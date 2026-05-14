import { buildAuthHeaders, graphqlRequest } from './apiClient'

const RESTAURANT_ACTIVE_ORDERS_QUERY = `
  query RestaurantActiveOrders($restaurantId: ID) {
    restaurantActiveOrders(restaurant_id: $restaurantId) {
      order_id
      restaurant_id
      customer_id
      customer_name
      order_status
      total
      delivery_address
      created_at
      delivery_id
      delivery_status
      courier_id
      items {
        order_item_id
        name
        quantity
        status
        total_price
      }
    }
  }
`

const ACCEPT_RESTAURANT_ORDER_MUTATION = `
  mutation AcceptRestaurantOrder($input: RestaurantOrderActionInput!) {
    acceptRestaurantOrder(input: $input) {
      ok
      order_id
      status
    }
  }
`

const REJECT_RESTAURANT_ORDER_MUTATION = `
  mutation RejectRestaurantOrder($input: RestaurantOrderActionInput!) {
    rejectRestaurantOrder(input: $input) {
      ok
      order_id
      status
    }
  }
`

const UPDATE_ORDER_ITEM_STATUS_MUTATION = `
  mutation UpdateOrderItemStatus($input: UpdateOrderItemStatusInput!) {
    updateOrderItemStatus(input: $input) {
      ok
      order_item_id
      order_id
      order_item_status
      order_status
    }
  }
`

const RESTAURANT_MENU_QUERY = `
  query RestaurantMenu($restaurantId: ID!) {
    restaurantMenu(restaurant_id: $restaurantId) {
      restaurant_product_id
      product_id
      category
      name
      description
      price
      is_available
      estimated_preparation_time_min
    }
  }
`

const CREATE_RESTAURANT_MENU_PRODUCT_MUTATION = `
  mutation CreateRestaurantMenuProduct($input: CreateRestaurantMenuProductInput!) {
    createRestaurantMenuProduct(input: $input) {
      ok
      restaurant_product_id
      product_id
      restaurant_id
      message
    }
  }
`

const UPDATE_RESTAURANT_MENU_PRODUCT_MUTATION = `
  mutation UpdateRestaurantMenuProduct($input: UpdateRestaurantMenuProductInput!) {
    updateRestaurantMenuProduct(input: $input) {
      ok
      restaurant_product_id
      product_id
      restaurant_id
      message
    }
  }
`

const DELETE_RESTAURANT_MENU_PRODUCT_MUTATION = `
  mutation DeleteRestaurantMenuProduct($input: DeleteRestaurantMenuProductInput!) {
    deleteRestaurantMenuProduct(input: $input) {
      ok
      restaurant_product_id
      product_id
      restaurant_id
      message
    }
  }
`

export async function fetchRestaurantActiveOrders(session) {
  const data = await graphqlRequest({
    query: RESTAURANT_ACTIVE_ORDERS_QUERY,
    variables: {
      restaurantId: session.restaurantId || null,
    },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.restaurantActiveOrders ?? []
}

export async function acceptRestaurantOrder({ session, orderId }) {
  const data = await graphqlRequest({
    query: ACCEPT_RESTAURANT_ORDER_MUTATION,
    variables: {
      input: {
        order_id: orderId,
      },
    },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.acceptRestaurantOrder
}

export async function rejectRestaurantOrder({ session, orderId, reason = null }) {
  const data = await graphqlRequest({
    query: REJECT_RESTAURANT_ORDER_MUTATION,
    variables: {
      input: {
        order_id: orderId,
        reason,
      },
    },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.rejectRestaurantOrder
}

export async function updateOrderItemStatus({ session, orderItemId, status }) {
  const data = await graphqlRequest({
    query: UPDATE_ORDER_ITEM_STATUS_MUTATION,
    variables: {
      input: {
        order_item_id: orderItemId,
        status,
      },
    },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.updateOrderItemStatus
}

export async function fetchRestaurantMenuProducts(session) {
  if (!session?.restaurantId) {
    throw new Error('Define Restaurant ID no login para gerir o menu.')
  }

  const data = await graphqlRequest({
    query: RESTAURANT_MENU_QUERY,
    variables: {
      restaurantId: session.restaurantId,
    },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.restaurantMenu ?? []
}

export async function createRestaurantMenuProduct({ session, input }) {
  const data = await graphqlRequest({
    query: CREATE_RESTAURANT_MENU_PRODUCT_MUTATION,
    variables: {
      input: {
        restaurant_id: session.restaurantId || null,
        ...input,
      },
    },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.createRestaurantMenuProduct
}

export async function updateRestaurantMenuProduct({ session, input }) {
  const data = await graphqlRequest({
    query: UPDATE_RESTAURANT_MENU_PRODUCT_MUTATION,
    variables: { input },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.updateRestaurantMenuProduct
}

export async function deleteRestaurantMenuProduct({ session, restaurantProductId }) {
  const data = await graphqlRequest({
    query: DELETE_RESTAURANT_MENU_PRODUCT_MUTATION,
    variables: {
      input: {
        restaurant_product_id: restaurantProductId,
      },
    },
    headers: buildAuthHeaders({
      devUserId: session.devUserId,
      token: session.token,
    }),
  })

  return data.deleteRestaurantMenuProduct
}
