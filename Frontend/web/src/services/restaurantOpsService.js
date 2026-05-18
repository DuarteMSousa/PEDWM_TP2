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

function normalizeCategoryName(value) {
  return String(value ?? '').trim().toLowerCase()
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
    payment_method: order.payment?.method ?? null,
    payment_status: order.payment?.status ?? null,
    events: (order.events ?? []).map((event) => ({
      event_type: event.event_type,
      timestamp: event.timestamp,
    })),
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

function mapNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    timestamp: notification.sent_at,
    read: Boolean(notification.read_at),
    read_at: notification.read_at,
  }
}

const LOGIN_USER_MUTATION = `
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      id
      name
      user_type
    }
  }
`

const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      user_type
    }
  }
`

const OPERATOR_RESTAURANT_QUERY = `
  query OperatorRestaurant($userId: ID!) {
    operatorRestaurant(user_id: $userId) {
      id
      name
      chain_id
    }
  }
`

const RESTAURANT_ORDER_DETAIL_QUERY = `
  query RestaurantOrder($restaurantId: ID!, $orderId: ID!) {
    restaurantOrder(restaurant_id: $restaurantId, order_id: $orderId) {
      id
      user_id
      restaurant_id
      status
      total
      restaurant_name_snapshot
      created_at
      updated_at
      user { id name email }
      address { street city postal_code country latitude longitude }
      payment { id method status amount transaction_id paid_at expired_at }
      delivery {
        id
        courier_id
        status
        pickup_time
        delivery_time
        delivery_fee
        courier { user_id status user { name } }
      }
      events { event_type timestamp payload }
      items {
        id
        status
        quantity
        unit_price
        product_name_snapshot
        total_price
        options {
          id
          option_name_snapshot
          extra_price
        }
      }
      discounts {
        id
        name_snapshot
        discount_amount
        discount_type
        discount_target
      }
    }
  }
`

const RESTAURANT_ORDERS_HISTORY_QUERY = `
  query RestaurantOrdersHistory($restaurantId: ID!, $statuses: [OrderStatus!], $page: Int, $perPage: Int) {
    restaurantOrders(restaurant_id: $restaurantId, statuses: $statuses, page: $page, per_page: $perPage) {
      id
      user_id
      status
      total
      restaurant_name_snapshot
      created_at
      updated_at
      user { id name }
      address { street city }
      payment { method status }
      delivery { id status }
    }
  }
`

const RESTAURANT_ACTIVE_ORDERS_QUERY = `
  query RestaurantActiveOrders($restaurantId: ID!) {
    restaurantActiveOrders(restaurant_id: $restaurantId) {
      id
      user_id
      restaurant_id
      status
      total
      created_at
      user { id name }
      address { street city }
      delivery { id courier_id status }
      events { event_type timestamp }
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

const CANCEL_RESTAURANT_ORDER_MUTATION = `
  mutation CancelRestaurantOrder($input: RestaurantOrderDecisionInput!) {
    cancelRestaurantOrder(input: $input) {
      id
      status
    }
  }
`

const START_PREPARING_ORDER_MUTATION = `
  mutation StartPreparingOrder($input: RestaurantOrderDecisionInput!) {
    startPreparingOrder(input: $input) {
      id
      status
    }
  }
`

const MARK_ORDER_READY_MUTATION = `
  mutation MarkOrderReady($input: RestaurantOrderDecisionInput!) {
    markOrderReady(input: $input) {
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

const CHAIN_PROMOTIONS_QUERY = `
  query ChainPromotions($chainId: ID!) {
    chainPromotions(chain_id: $chainId) {
      id
      name
      description
      type
      target
      start_date
      end_date
      promotionItems {
        id
        product_id
        category_id
        discount
      }
    }
  }
`

const CHAIN_COUPONS_QUERY = `
  query ChainCoupons($chainId: ID!) {
    chainCoupons(chain_id: $chainId) {
      id
      code
      description
      type
      target
      expiry_date
    }
  }
`

const CREATE_PROMOTION_MUTATION = `
  mutation CreatePromotion($actorUserId: ID!, $input: CreatePromotionInput!) {
    createPromotion(actor_user_id: $actorUserId, input: $input) {
      id
      name
    }
  }
`

const UPDATE_PROMOTION_MUTATION = `
  mutation UpdatePromotion($actorUserId: ID!, $id: ID!, $input: UpdatePromotionInput!) {
    updatePromotion(actor_user_id: $actorUserId, id: $id, input: $input) {
      id
      name
    }
  }
`

const UPDATE_COUPON_MUTATION = `
  mutation UpdateCoupon($id: ID!, $input: UpdateCouponInput!) {
    updateCoupon(id: $id, input: $input) {
      id
      code
    }
  }
`

const CHAIN_PRODUCTS_QUERY = `
  query ChainProducts($chainId: ID!) {
    chainCategories(chain_id: $chainId) {
      id
      name
      products { id name }
    }
  }
`

const DELETE_PROMOTION_MUTATION = `
  mutation DeletePromotion($actorUserId: ID!, $id: ID!) {
    deletePromotion(actor_user_id: $actorUserId, id: $id)
  }
`

const CREATE_COUPON_MUTATION = `
  mutation CreateCoupon($input: CreateCouponInput!) {
    createCoupon(input: $input) {
      id
      code
    }
  }
`

const DELETE_COUPON_MUTATION = `
  mutation DeleteCoupon($id: ID!) {
    deleteCoupon(id: $id)
  }
`

const TARGET_REVIEWS_QUERY = `
  query TargetReviews($targetType: ReviewTargetTypeInput!, $targetId: ID!, $perPage: Int) {
    targetReviews(target_type: $targetType, target_id: $targetId, per_page: $perPage) {
      id
      user_id
      rating
      comment
      target_type
      target_id
      created_at
    }
  }
`

const RESTAURANT_QUERY = `
  query Restaurant($id: ID!) {
    restaurant(id: $id) {
      id
      name
      chain_id
    }
  }
`

const CHAIN_CATEGORIES_QUERY = `
  query ChainCategories($chainId: ID!) {
    chainCategories(chain_id: $chainId) {
      id
      name
    }
  }
`

const UPDATE_CATEGORY_MUTATION = `
  mutation UpdateCategory($id: ID!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
      name
    }
  }
`

const DELETE_CATEGORY_MUTATION = `
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`

const PRODUCT_OPTION_GROUPS_QUERY_ADMIN = `
  query ProductOptionGroupsAdmin($productId: ID!) {
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

const UPDATE_PRODUCT_MUTATION = `
  mutation UpdateProduct($actorUserId: ID!, $id: ID!, $input: UpdateProductInput!) {
    updateProduct(actor_user_id: $actorUserId, id: $id, input: $input) {
      id
      name
      price
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

export async function bootstrapRestaurantSession({
  email,
  password,
  restaurant,
  restaurantId = '',
  token,
}) {
  const trimmedEmail = email.trim()
  const trimmedPassword = password.trim()
  const trimmedRestaurantId = String(restaurantId ?? '').trim()
  const trimmedToken = token.trim()

  if (!trimmedEmail || !trimmedPassword) {
    throw new Error('Preenche email e password.')
  }

  const userData = await graphqlRequest({
    query: LOGIN_USER_MUTATION,
    variables: {
      email: trimmedEmail,
      password: trimmedPassword,
    },
  })

  if (!userData.loginUser) {
    throw new Error('Nao foi possivel autenticar o utilizador.')
  }

  const authenticatedUser = userData.loginUser
  const requestSession = {
    devUserId: authenticatedUser.id,
    token: trimmedToken,
  }
  const operatorName = authenticatedUser.name || trimmedEmail.split('@')[0] || 'manager'
  const userType = authenticatedUser.user_type

  if (userType !== 'LOCAL_MANAGER' && userType !== 'CHAIN_MANAGER') {
    throw new Error(`Utilizador ${operatorName} nao tem perfil de restaurante.`)
  }

  let resolvedRestaurant = null

  if (trimmedRestaurantId) {
    const restaurantData = await graphqlRequest({
      query: RESTAURANT_QUERY,
      variables: { id: trimmedRestaurantId },
      ...requestOptions(requestSession),
    })
    resolvedRestaurant = restaurantData.restaurant
  } else {
    const managerRestaurantData = await graphqlRequest({
      query: OPERATOR_RESTAURANT_QUERY,
      variables: { userId: authenticatedUser.id },
      ...requestOptions(requestSession),
    })
    resolvedRestaurant = managerRestaurantData.operatorRestaurant
  }

  if (!resolvedRestaurant?.id) {
    throw new Error('Conta sem restaurante associado. Cria um restaurante ou pede associacao ao administrador.')
  }

  return {
    operatorName,
    restaurant: resolvedRestaurant.name || restaurant || 'Unidade',
    restaurantId: resolvedRestaurant.id,
    chainId: resolvedRestaurant.chain_id ?? null,
    userId: authenticatedUser.id,
    devUserId: authenticatedUser.id,
    token: trimmedToken,
    userType,
  }
}

export async function registerRestaurantUser({
  email,
  password,
  restaurant,
  restaurantId,
  token,
}) {
  const trimmedEmail = String(email ?? '').trim()
  const trimmedPassword = String(password ?? '').trim()

  if (!trimmedEmail || !trimmedPassword) {
    throw new Error('Preenche email e password.')
  }

  const defaultName = trimmedEmail.split('@')[0] || 'manager'

  try {
    await graphqlRequest({
      query: CREATE_USER_MUTATION,
      variables: {
        input: {
          name: defaultName,
          email: trimmedEmail,
          password: trimmedPassword,
          user_type: 'CHAIN_MANAGER',
        },
      },
    })
  } catch (error) {
    const message = String(error?.message ?? '')
    if (
      message.includes('users_email_unique') ||
      message.toLowerCase().includes('unique constraint') ||
      message.toLowerCase().includes('unique') ||
      message.toLowerCase().includes('ja esta registado') ||
      message.toLowerCase().includes('duplicate') ||
      message.toLowerCase().includes('already')
    ) {
      throw new Error('Este email ja esta registado.')
    }

    throw error
  }

  return bootstrapRestaurantSession({
    email: trimmedEmail,
    password: trimmedPassword,
    restaurant,
    restaurantId,
    token,
  })
}

export async function fetchRestaurantOrderDetail({ session, orderId }) {
  if (!orderId) return null
  const data = await graphqlRequest({
    query: RESTAURANT_ORDER_DETAIL_QUERY,
    variables: {
      restaurantId: session.restaurantId,
      orderId,
    },
    ...requestOptions(session),
  })
  return data.restaurantOrder ?? null
}

export async function fetchRestaurantOrdersHistory({
  session,
  statuses = null,
  page = 1,
  perPage = 30,
}) {
  const data = await graphqlRequest({
    query: RESTAURANT_ORDERS_HISTORY_QUERY,
    variables: {
      restaurantId: session.restaurantId,
      statuses,
      page,
      perPage,
    },
    ...requestOptions(session),
  })
  return (data.restaurantOrders ?? []).map(mapOrder)
}

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
        reason: reason && String(reason).trim() !== '' ? String(reason).trim() : null,
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

export async function cancelRestaurantOrder({ session, orderId, reason = null }) {
  const data = await graphqlRequest({
    query: CANCEL_RESTAURANT_ORDER_MUTATION,
    variables: {
      input: {
        actor_user_id: actorUserId(session),
        order_id: orderId,
        reason: reason && String(reason).trim() !== '' ? String(reason).trim() : null,
      },
    },
    ...requestOptions(session),
  })

  return {
    ok: true,
    order_id: data.cancelRestaurantOrder.id,
    status: data.cancelRestaurantOrder.status,
  }
}

export async function startPreparingRestaurantOrder({ session, orderId }) {
  const data = await graphqlRequest({
    query: START_PREPARING_ORDER_MUTATION,
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
    order_id: data.startPreparingOrder.id,
    status: data.startPreparingOrder.status,
  }
}

export async function markRestaurantOrderReady({ session, orderId }) {
  const data = await graphqlRequest({
    query: MARK_ORDER_READY_MUTATION,
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
    order_id: data.markOrderReady.id,
    status: data.markOrderReady.status,
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

async function resolveCategoryId({ session, chainId, categoryName }) {
  const categoryData = await graphqlRequest({
    query: CHAIN_CATEGORIES_QUERY,
    variables: { chainId },
    ...requestOptions(session),
  })

  const existingCategory = (categoryData.chainCategories ?? []).find(
    (category) => normalizeCategoryName(category.name) === normalizeCategoryName(categoryName),
  )

  if (existingCategory) {
    return existingCategory.id
  }

  const createdCategory = await graphqlRequest({
    query: CREATE_CATEGORY_MUTATION,
    variables: {
      input: {
        chain_id: chainId,
        name: categoryName.trim(),
      },
    },
    ...requestOptions(session),
  })

  return createdCategory.createCategory.id
}

export async function createRestaurantMenuProduct({ session, input }) {
  const chainId = await fetchRestaurantChainId(session)
  if (!chainId) {
    throw new Error('Nao foi possivel descobrir a cadeia do restaurante.')
  }

  const categoryId = await resolveCategoryId({
    session,
    chainId,
    categoryName: input.category,
  })

  const productData = await graphqlRequest({
    query: CREATE_PRODUCT_MUTATION,
    variables: {
      actorUserId: actorUserId(session),
      input: {
        category_id: categoryId,
        name: input.name,
        price: Number(input.price),
        description: input.description,
        option_groups: Array.isArray(input.option_groups)
          ? input.option_groups.map((group) => ({
              name: group.name,
              min_options: Number(group.min_options ?? 0),
              max_options: Number(group.max_options ?? 1),
              options: (group.options ?? []).map((option) => ({
                name: option.name,
                extra_price: Number(option.extra_price ?? 0),
                default_option: Boolean(option.default_option),
              })),
            }))
          : [],
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

export async function fetchChainPromotions({ session, chainId }) {
  const data = await graphqlRequest({
    query: CHAIN_PROMOTIONS_QUERY,
    variables: { chainId: chainId ?? session.chainId },
    ...requestOptions(session),
  })
  return data.chainPromotions ?? []
}

export async function fetchChainCoupons({ session, chainId }) {
  const data = await graphqlRequest({
    query: CHAIN_COUPONS_QUERY,
    variables: { chainId: chainId ?? session.chainId },
    ...requestOptions(session),
  })
  return data.chainCoupons ?? []
}

export async function createChainPromotion({ session, input }) {
  const data = await graphqlRequest({
    query: CREATE_PROMOTION_MUTATION,
    variables: {
      actorUserId: actorUserId(session),
      input: {
        chain_id: session.chainId,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        target: input.target,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        items: input.items ?? [],
      },
    },
    ...requestOptions(session),
  })
  return data.createPromotion
}

export async function updateChainPromotion({ session, promotionId, input }) {
  const data = await graphqlRequest({
    query: UPDATE_PROMOTION_MUTATION,
    variables: {
      actorUserId: actorUserId(session),
      id: promotionId,
      input: {
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        target: input.target,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        items: input.items ?? [],
      },
    },
    ...requestOptions(session),
  })
  return data.updatePromotion
}

export async function updateChainCoupon({ session, couponId, input }) {
  const data = await graphqlRequest({
    query: UPDATE_COUPON_MUTATION,
    variables: {
      id: couponId,
      input: {
        code: input.code,
        description: input.description ?? null,
        type: input.type,
        target: input.target,
        discount: Number(input.discount),
        product_id: input.product_id ?? null,
        category_id: input.category_id ?? null,
        min_order_total: input.min_order_total ? Number(input.min_order_total) : null,
        max_discount_amount: input.max_discount_amount
          ? Number(input.max_discount_amount)
          : null,
        max_uses: input.max_uses ? Number(input.max_uses) : null,
        expiry_date: input.expiry_date ?? null,
      },
    },
    ...requestOptions(session),
  })
  return data.updateCoupon
}

export async function fetchChainProductsAndCategories({ session, chainId }) {
  const data = await graphqlRequest({
    query: CHAIN_PRODUCTS_QUERY,
    variables: { chainId: chainId ?? session.chainId },
    ...requestOptions(session),
  })
  const categories = (data.chainCategories ?? []).map((cat) => ({ id: cat.id, name: cat.name }))
  const products = (data.chainCategories ?? []).flatMap((cat) =>
    (cat.products ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      category_id: cat.id,
      category_name: cat.name,
    })),
  )
  return { categories, products }
}

export async function deleteChainPromotion({ session, promotionId }) {
  const data = await graphqlRequest({
    query: DELETE_PROMOTION_MUTATION,
    variables: { actorUserId: actorUserId(session), id: promotionId },
    ...requestOptions(session),
  })
  return { ok: Boolean(data.deletePromotion) }
}

export async function createChainCoupon({ session, input }) {
  const data = await graphqlRequest({
    query: CREATE_COUPON_MUTATION,
    variables: {
      input: {
        chain_id: session.chainId,
        code: input.code,
        description: input.description ?? null,
        type: input.type,
        target: input.target,
        discount: Number(input.discount),
        product_id: input.product_id ?? null,
        category_id: input.category_id ?? null,
        min_order_total: input.min_order_total
          ? Number(input.min_order_total)
          : null,
        max_discount_amount: input.max_discount_amount
          ? Number(input.max_discount_amount)
          : null,
        max_uses: input.max_uses ? Number(input.max_uses) : null,
        expiry_date: input.expiry_date ?? null,
      },
    },
    ...requestOptions(session),
  })
  return data.createCoupon
}

export async function deleteChainCoupon({ session, couponId }) {
  const data = await graphqlRequest({
    query: DELETE_COUPON_MUTATION,
    variables: { id: couponId },
    ...requestOptions(session),
  })
  return { ok: Boolean(data.deleteCoupon) }
}

export async function fetchRestaurantReviews({ session, restaurantId, limit = 30 }) {
  const data = await graphqlRequest({
    query: TARGET_REVIEWS_QUERY,
    variables: {
      targetType: 'RESTAURANT',
      targetId: restaurantId ?? session.restaurantId,
      perPage: limit,
    },
    ...requestOptions(session),
  })
  return data.targetReviews ?? []
}

export async function fetchChainCategories({ session, chainId }) {
  const data = await graphqlRequest({
    query: CHAIN_CATEGORIES_QUERY,
    variables: { chainId: chainId ?? session.chainId },
    ...requestOptions(session),
  })
  return data.chainCategories ?? []
}

export async function createChainCategory({ session, chainId, name }) {
  const data = await graphqlRequest({
    query: CREATE_CATEGORY_MUTATION,
    variables: {
      input: { chain_id: chainId ?? session.chainId, name: name.trim() },
    },
    ...requestOptions(session),
  })
  return data.createCategory
}

export async function updateChainCategory({ session, categoryId, name }) {
  const data = await graphqlRequest({
    query: UPDATE_CATEGORY_MUTATION,
    variables: { id: categoryId, input: { name: name.trim() } },
    ...requestOptions(session),
  })
  return data.updateCategory
}

export async function deleteChainCategory({ session, categoryId }) {
  const data = await graphqlRequest({
    query: DELETE_CATEGORY_MUTATION,
    variables: { id: categoryId },
    ...requestOptions(session),
  })
  return { ok: Boolean(data.deleteCategory) }
}

export async function updateRestaurantMenuProductWithOptions({
  session,
  productId,
  name,
  description,
  optionGroups,
}) {
  const input = {}
  if (name !== undefined) input.name = name
  if (description !== undefined) input.description = description
  if (optionGroups !== undefined) {
    input.option_groups = optionGroups.map((group) => ({
      id: group.id ?? null,
      name: group.name,
      min_options: Number(group.min_options ?? 0),
      max_options: Number(group.max_options ?? 1),
      options: (group.options ?? []).map((option) => ({
        id: option.id ?? null,
        name: option.name,
        extra_price: Number(option.extra_price ?? 0),
        default_option: Boolean(option.default_option),
      })),
    }))
  }

  const data = await graphqlRequest({
    query: UPDATE_PRODUCT_MUTATION,
    variables: {
      actorUserId: actorUserId(session),
      id: productId,
      input,
    },
    ...requestOptions(session),
  })
  return data.updateProduct
}

export async function fetchProductOptionGroupsAdmin({ session, productId }) {
  const data = await graphqlRequest({
    query: PRODUCT_OPTION_GROUPS_QUERY_ADMIN,
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

export async function fetchOperatorNotifications({
  session,
  unreadOnly = false,
  limit = 50,
}) {
  const data = await graphqlRequest({
    query: CLIENT_NOTIFICATIONS_QUERY,
    variables: {
      userId: actorUserId(session),
      unreadOnly,
      limit,
    },
    ...requestOptions(session),
  })

  return (data.clientNotifications ?? []).map(mapNotification)
}

export async function markOperatorNotificationRead({ session, notificationId }) {
  const data = await graphqlRequest({
    query: MARK_NOTIFICATION_READ_MUTATION,
    variables: {
      userId: actorUserId(session),
      notificationId,
    },
    ...requestOptions(session),
  })

  return data.markNotificationRead
}

export async function markAllOperatorNotificationsRead({ session }) {
  const data = await graphqlRequest({
    query: MARK_ALL_NOTIFICATIONS_READ_MUTATION,
    variables: {
      userId: actorUserId(session),
    },
    ...requestOptions(session),
  })

  return data.markAllClientNotificationsRead
}
