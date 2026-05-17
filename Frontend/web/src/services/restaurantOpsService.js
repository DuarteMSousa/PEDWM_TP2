import { buildAuthHeaders, graphqlRequest } from './apiClient'

function requestOptions(session) {
  return {
    headers: buildAuthHeaders({
      devUserId: session?.devUserId,
      token: session?.token,
    }),
  }
}

function actorUserId(session) {
  return session?.userId || session?.devUserId || 'system'
}

function mapOrder(order) {
  return {
    order_id: order.id,
    restaurant_id: order.restaurant_id,
    customer_id: order.user_id,
    customer_name: order.user?.name ?? order.user_id,
    order_status: order.status,
    total: order.total,
    delivery_address: order.address
      ? `${order.address.street}, ${order.address.city}`
      : '-',
    created_at: order.created_at,
    delivery_id: order.delivery?.id ?? null,
    delivery_status: order.delivery?.status ?? null,
    courier_id: order.delivery?.courier_id ?? null,
    items: (order.items ?? []).map((item) => ({
      order_item_id: item.id,
      name: item.product_name_snapshot,
      quantity: item.quantity,
      status: item.status,
      total_price: item.total_price,
    })),
  }
}

function mapRestaurantProduct(item, categories = []) {
  const category = categories.find((entry) => entry.id === item.product?.category_id)
  return {
    restaurant_product_id: item.id,
    product_id: item.product_id,
    restaurant_id: item.restaurant_id,
    category: category?.name ?? '',
    name: item.product?.name ?? 'Produto',
    description: item.product?.description ?? '',
    price: item.local_price ?? item.product?.price ?? 0,
    is_available: Boolean(item.is_available),
    estimated_preparation_time_min: item.estimated_preparation_time_min,
  }
}

const RESTAURANT_ACTIVE_ORDERS_QUERY = `
  query RestaurantActiveOrders($restaurantId: ID!) {
    restaurantActiveOrders(restaurant_id: $restaurantId) {
      id
      user_id
      restaurant_id
      status
      total
      created_at
      user { name }
      address { street city }
      delivery { id courier_id status }
      items {
        id
        status
        quantity
        product_name_snapshot
        total_price
      }
    }
  }
`

const ACCEPT_RESTAURANT_ORDER_MUTATION = `
  mutation AcceptRestaurantOrder($input: RestaurantOrderDecisionInput!) {
    acceptRestaurantOrder(input: $input) {
      id
      status
    }
  }
`

const REJECT_RESTAURANT_ORDER_MUTATION = `
  mutation RejectRestaurantOrder($input: RestaurantOrderDecisionInput!) {
    rejectRestaurantOrder(input: $input) {
      id
      status
    }
  }
`

const UPDATE_ORDER_ITEM_STATUS_MUTATION = `
  mutation UpdateOrderItemStatus($input: UpdateOrderItemStatusInput!) {
    updateOrderItemStatus(input: $input) {
      id
      status
      items {
        id
        status
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

const RESTAURANT_QUERY = `
  query Restaurant($id: ID!) {
    restaurant(id: $id) {
      id
      chain_id
    }
  }
`

const CREATE_CATEGORY_MUTATION = `
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
      name
    }
  }
`

const CREATE_PRODUCT_MUTATION = `
  mutation CreateProduct($actorUserId: ID!, $input: CreateProductInput!) {
    createProduct(actor_user_id: $actorUserId, input: $input) {
      id
      name
      price
    }
  }
`

const CREATE_RESTAURANT_PRODUCT_MUTATION = `
  mutation CreateRestaurantProduct($input: CreateRestaurantProductInput!) {
    createRestaurantProduct(input: $input) {
      id
      restaurant_id
      product_id
      local_price
      is_available
      estimated_preparation_time_min
    }
  }
`

const UPDATE_RESTAURANT_PRODUCT_MUTATION = `
  mutation UpdateRestaurantProduct($id: ID!, $input: UpdateRestaurantProductInput!) {
    updateRestaurantProduct(id: $id, input: $input) {
      id
      restaurant_id
      product_id
      local_price
      is_available
      estimated_preparation_time_min
    }
  }
`

const SET_RESTAURANT_PRODUCT_AVAILABILITY_MUTATION = `
  mutation SetRestaurantProductAvailability($id: ID!, $isAvailable: Boolean!) {
    setRestaurantProductAvailability(id: $id, is_available: $isAvailable) {
      id
      is_available
    }
  }
`

export async function fetchRestaurantActiveOrders(session) {
  const data = await graphqlRequest({
    query: RESTAURANT_ACTIVE_ORDERS_QUERY,
    variables: {
      restaurantId: session.restaurantId,
    },
    ...requestOptions(session),
  })

  return (data.restaurantActiveOrders ?? []).map(mapOrder)
}

export async function acceptRestaurantOrder({ session, orderId }) {
  const data = await graphqlRequest({
    query: ACCEPT_RESTAURANT_ORDER_MUTATION,
    variables: {
      input: {
        actor_user_id: actorUserId(session),
        order_id: orderId,
      },
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    order_id: data.acceptRestaurantOrder.id,
    status: data.acceptRestaurantOrder.status,
  }
}

export async function rejectRestaurantOrder({ session, orderId, reason = null }) {
  const data = await graphqlRequest({
    query: REJECT_RESTAURANT_ORDER_MUTATION,
    variables: {
      input: {
        actor_user_id: actorUserId(session),
        order_id: orderId,
        reason,
      },
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    order_id: data.rejectRestaurantOrder.id,
    status: data.rejectRestaurantOrder.status,
  }
}

export async function updateOrderItemStatus({ session, orderItemId, status }) {
  const data = await graphqlRequest({
    query: UPDATE_ORDER_ITEM_STATUS_MUTATION,
    variables: {
      input: {
        actor_user_id: actorUserId(session),
        order_item_id: orderItemId,
        status,
      },
    },
    ...requestOptions(session),
  })

  const item = data.updateOrderItemStatus.items?.find((entry) => entry.id === orderItemId)
  return {
    ok: true,
    order_item_id: orderItemId,
    order_id: data.updateOrderItemStatus.id,
    order_item_status: item?.status ?? status,
    order_status: data.updateOrderItemStatus.status,
  }
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
    ...requestOptions(session),
  })

  return (data.restaurantMenu?.products ?? []).map((item) =>
    mapRestaurantProduct(item, data.restaurantMenu?.categories ?? []),
  )
}

async function fetchRestaurantChainId(session) {
  if (session.chainId) return session.chainId

  const data = await graphqlRequest({
    query: RESTAURANT_QUERY,
    variables: { id: session.restaurantId },
    ...requestOptions(session),
  })

  return data.restaurant?.chain_id
}

export async function createRestaurantMenuProduct({ session, input }) {
  const chainId = await fetchRestaurantChainId(session)
  if (!chainId) {
    throw new Error('Nao foi possivel descobrir a cadeia do restaurante.')
  }

  const categoryData = await graphqlRequest({
    query: CREATE_CATEGORY_MUTATION,
    variables: {
      input: {
        chain_id: chainId,
        name: input.category,
      },
    },
    ...requestOptions(session),
  })

  const productData = await graphqlRequest({
    query: CREATE_PRODUCT_MUTATION,
    variables: {
      actorUserId: actorUserId(session),
      input: {
        category_id: categoryData.createCategory.id,
        name: input.name,
        price: Number(input.price),
        description: input.description,
        option_groups: [],
      },
    },
    ...requestOptions(session),
  })

  const restaurantProductData = await graphqlRequest({
    query: CREATE_RESTAURANT_PRODUCT_MUTATION,
    variables: {
      input: {
        restaurant_id: session.restaurantId,
        product_id: productData.createProduct.id,
        local_price: Number(input.price),
        is_available: Boolean(input.is_available),
        estimated_preparation_time_min: input.estimated_preparation_time_min,
      },
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    restaurant_product_id: restaurantProductData.createRestaurantProduct.id,
    product_id: restaurantProductData.createRestaurantProduct.product_id,
    restaurant_id: restaurantProductData.createRestaurantProduct.restaurant_id,
    message: 'Produto criado.',
  }
}

export async function updateRestaurantMenuProduct({ session, input }) {
  const payload = {}

  if (input.price !== undefined) payload.local_price = Number(input.price)
  if (input.is_available !== undefined) payload.is_available = Boolean(input.is_available)
  if (input.estimated_preparation_time_min !== undefined) {
    payload.estimated_preparation_time_min = input.estimated_preparation_time_min
  }

  const data = await graphqlRequest({
    query: UPDATE_RESTAURANT_PRODUCT_MUTATION,
    variables: {
      id: input.restaurant_product_id,
      input: payload,
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    restaurant_product_id: data.updateRestaurantProduct.id,
    product_id: data.updateRestaurantProduct.product_id,
    restaurant_id: data.updateRestaurantProduct.restaurant_id,
    message: 'Produto atualizado.',
  }
}

export async function deleteRestaurantMenuProduct({ session, restaurantProductId }) {
  await graphqlRequest({
    query: SET_RESTAURANT_PRODUCT_AVAILABILITY_MUTATION,
    variables: {
      id: restaurantProductId,
      isAvailable: false,
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    restaurant_product_id: restaurantProductId,
    message: 'Produto desativado.',
  }
}
