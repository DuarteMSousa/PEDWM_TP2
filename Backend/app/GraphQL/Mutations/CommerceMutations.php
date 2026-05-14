<?php

namespace App\GraphQL\Mutations;

use App\Enums\OrderEventType;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentEventType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\UserType;
use App\Enums\NotificationType;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductOption;
use App\Models\Restaurant;
use App\Models\RestaurantProduct;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\CheckoutDiscountService\CheckoutDiscountServiceInterface;
use App\Services\IdempotencyService;
use App\Services\NotificationService\NotificationServiceInterface;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CommerceMutations
{
    public function __construct(
        private NotificationServiceInterface $notificationService,
        private CheckoutDiscountServiceInterface $checkoutDiscountService,
    ) {
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function addCartItem(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];

        /** @var RestaurantProduct|null $restaurantProduct */
        $restaurantProduct = RestaurantProduct::query()
            ->with('product')
            ->whereKey($input['restaurant_product_id'])
            ->first();

        if (! $restaurantProduct) {
            throw new UserError('Restaurant product not found.');
        }

        if (! $restaurantProduct->is_available) {
            throw new UserError('Restaurant product is not available.');
        }

        $quantity = max(1, (int) $input['quantity']);
        $unitPrice = (float) ($restaurantProduct->local_price ?? $restaurantProduct->product?->price ?? 0);

        /** @var Cart $cart */
        $cart = Cart::query()->firstOrCreate(
            ['user_id' => $user->id],
            ['total' => 0]
        );

        $otherRestaurantItemExists = CartItem::query()
            ->where('cart_id', $cart->id)
            ->whereHas('restaurantProduct', fn ($query) => $query->where('restaurant_id', '!=', $restaurantProduct->restaurant_id))
            ->exists();

        if ($otherRestaurantItemExists) {
            throw new UserError('Cart can only contain items from one restaurant at a time.');
        }

        /** @var CartItem|null $existing */
        $existing = CartItem::query()
            ->where('cart_id', $cart->id)
            ->where('restaurant_product_id', $restaurantProduct->id)
            ->first();

        if ($existing) {
            $newQuantity = $existing->quantity + $quantity;
            $existing->update([
                'quantity' => $newQuantity,
                'unit_price' => $unitPrice,
                'total_price' => $unitPrice * $newQuantity,
            ]);
        } else {
            CartItem::query()->create([
                'cart_id' => $cart->id,
                'restaurant_product_id' => $restaurantProduct->id,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $unitPrice * $quantity,
            ]);
        }

        return $this->loadCartPayload($cart->id);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function updateCartItem(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];
        $quantity = max(0, (int) $input['quantity']);

        /** @var CartItem|null $cartItem */
        $cartItem = CartItem::query()
            ->with(['cart', 'restaurantProduct.product'])
            ->whereKey($input['cart_item_id'])
            ->first();

        if (! $cartItem || $cartItem->cart?->user_id !== $user->id) {
            throw new UserError('Cart item not found.');
        }

        if ($quantity === 0) {
            $cartItem->delete();
        } else {
            $unitPrice = (float) ($cartItem->restaurantProduct?->local_price ?? $cartItem->restaurantProduct?->product?->price ?? 0);
            $cartItem->update([
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $unitPrice * $quantity,
            ]);
        }

        return $this->loadCartPayload($cartItem->cart_id);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>|null
     */
    public function removeCartItem(null $_, array $args): ?array
    {
        $user = $this->resolveAuthenticatedUser();
        $cartItemId = $args['input']['cart_item_id'];

        /** @var CartItem|null $cartItem */
        $cartItem = CartItem::query()
            ->with('cart')
            ->whereKey($cartItemId)
            ->first();

        if (! $cartItem || $cartItem->cart?->user_id !== $user->id) {
            throw new UserError('Cart item not found.');
        }

        $cartId = $cartItem->cart_id;
        $cartItem->delete();

        return $this->loadCartPayload($cartId);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function clearMyCart(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        $cart = Cart::query()->where('user_id', $user->id)->first();

        if (! $cart) {
            return ['ok' => true];
        }

        DB::transaction(function () use ($cart): void {
            $cart->items()->delete();
            $cart->update(['total' => 0]);
        });

        return ['ok' => true];
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function checkout(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if ($user->user_type !== UserType::CUSTOMER) {
            throw new UserError('Only customer users can perform checkout.');
        }

        $input = $args['input'];

        /** @var Cart|null $cart */
        $cart = Cart::query()
            ->with(['items.restaurantProduct.product', 'items.options.productOption'])
            ->where('user_id', $user->id)
            ->first();

        if (! $cart || $cart->items->isEmpty()) {
            throw new UserError('Cart is empty.');
        }

        $address = $this->resolveCheckoutAddress($user->id, $input['address_id'] ?? null);
        if (! $address) {
            throw new UserError('Delivery address not found.');
        }

        $restaurantId = $cart->items->first()?->restaurantProduct?->restaurant_id;
        if (! $restaurantId) {
            throw new UserError('Cart restaurant could not be resolved.');
        }

        $allSameRestaurant = $cart->items->every(fn ($item) => $item->restaurantProduct?->restaurant_id === $restaurantId);
        if (! $allSameRestaurant) {
            throw new UserError('Cart items must belong to the same restaurant.');
        }

        $paymentMethod = PaymentMethod::from($input['payment_method']);
        $couponCode = isset($input['coupon_code']) ? trim((string) $input['coupon_code']) : null;
        $couponCode = $couponCode !== '' ? $couponCode : null;

        return app(IdempotencyService::class)->execute(
            user: $user,
            operation: 'checkout',
            requestPayload: $input,
            callback: function () use ($user, $cart, $address, $restaurantId, $paymentMethod, $couponCode): array {
                $created = DB::transaction(function () use ($user, $cart, $address, $restaurantId, $paymentMethod, $couponCode): array {
                    $subTotal = 0.0;
                    $restaurantName = $cart->items->first()?->restaurantProduct?->restaurant?->name ?? 'Restaurante';
                    $restaurant = Restaurant::query()->with('chain')->whereKey($restaurantId)->first();

                    $order = Order::query()->create([
                        'user_id' => $user->id,
                        'restaurant_id' => $restaurantId,
                        'status' => OrderStatus::PENDING,
                        'total' => 0,
                        'restaurant_name_snapshot' => $restaurantName,
                    ]);

                    /** @var Collection<string, array{order_item: OrderItem, product_id: ?string, category_id: ?string, line_total: float}> $itemMetadata */
                    $itemMetadata = collect();

                    foreach ($cart->items as $cartItem) {
                        $basePrice = (float) ($cartItem->unit_price ?? $cartItem->restaurantProduct?->local_price ?? $cartItem->restaurantProduct?->product?->price ?? 0);
                        $optionsTotal = $cartItem->options->sum(fn ($option) => (float) ($option->productOption?->extra_price ?? 0));
                        $lineTotal = ((float) $basePrice + (float) $optionsTotal) * (int) $cartItem->quantity;
                        $subTotal += $lineTotal;

                        $orderItem = $order->items()->create([
                            'restaurant_product_id' => $cartItem->restaurant_product_id,
                            'status' => OrderItemStatus::PENDING,
                            'quantity' => $cartItem->quantity,
                            'unit_price' => $basePrice,
                            'product_name_snapshot' => $cartItem->restaurantProduct?->product?->name ?? 'Produto',
                            'total_price' => $lineTotal,
                        ]);

                        foreach ($cartItem->options as $option) {
                            $orderItem->options()->create([
                                'product_option_id' => $option->product_option_id,
                                'option_name_snapshot' => $option->productOption?->name ?? 'Opcao',
                                'extra_price' => (float) ($option->productOption?->extra_price ?? 0),
                            ]);
                        }

                        $itemMetadata->put($orderItem->id, [
                            'order_item' => $orderItem,
                            'product_id' => $cartItem->restaurantProduct?->product?->id,
                            'category_id' => $cartItem->restaurantProduct?->product?->category_id,
                            'line_total' => $lineTotal,
                        ]);
                    }

                    $deliveryFee = 0.0;
                    $discountResult = $this->checkoutDiscountService->resolveDiscounts(
                        chainId: $restaurant?->chain_id,
                        itemMetadata: $itemMetadata,
                        subTotal: $subTotal,
                        deliveryFee: $deliveryFee,
                        couponCode: $couponCode
                    );
                    $discountRows = $discountResult['discounts'];
                    $appliedCoupon = $discountResult['applied_coupon'];

                    foreach ($discountRows as $discountRow) {
                        $order->discounts()->create($discountRow);
                    }

                    $totalDiscount = collect($discountRows)->sum('discount_amount');
                    $orderTotal = max(0, round($subTotal + $deliveryFee - $totalDiscount, 2));
                    $order->update(['total' => $orderTotal]);

                    $order->address()->create([
                        'street' => $address->street,
                        'city' => $address->city,
                        'postal_code' => $address->postal_code,
                        'country' => $address->country,
                        'latitude' => $address->latitude,
                        'longitude' => $address->longitude,
                    ]);

                    $order->events()->create([
                        'event_type' => OrderEventType::ORDER_CREATED->value,
                        'timestamp' => now(),
                        'payload' => [
                            'subtotal' => $subTotal,
                            'discount_total' => $totalDiscount,
                            'order_total' => $orderTotal,
                        ],
                    ]);

                    $paymentStatus = $paymentMethod === PaymentMethod::CASH ? PaymentStatus::COMPLETED : PaymentStatus::PENDING;

                    $payment = Payment::query()->create([
                        'order_id' => $order->id,
                        'method' => $paymentMethod,
                        'status' => $paymentStatus,
                        'amount' => $orderTotal,
                        'paid_at' => $paymentStatus === PaymentStatus::COMPLETED ? now() : null,
                        'expired_at' => $paymentStatus === PaymentStatus::PENDING ? now()->addMinutes(10) : null,
                    ]);

                    $payment->events()->create([
                        'event_type' => PaymentEventType::PAYMENT_CREATED->value,
                        'timestamp' => now(),
                        'payload' => ['order_id' => $order->id],
                    ]);

                    if ($paymentStatus === PaymentStatus::COMPLETED) {
                        $payment->events()->create([
                            'event_type' => PaymentEventType::PAYMENT_COMPLETED->value,
                            'timestamp' => now(),
                            'payload' => ['order_id' => $order->id],
                        ]);

                        $order->update(['status' => OrderStatus::CONFIRMED]);
                        $order->events()->create([
                            'event_type' => OrderEventType::ORDER_CONFIRMED->value,
                            'timestamp' => now(),
                            'payload' => ['payment_id' => $payment->id],
                        ]);
                    }

                    Delivery::query()->create([
                        'order_id' => $order->id,
                        'courier_id' => null,
                        'status' => 'PENDING',
                        'delivery_fee' => 0,
                    ]);

                    if ($appliedCoupon) {
                        $appliedCoupon->increment('used_count');
                    }

                    $cart->items()->delete();
                    $cart->update(['total' => 0]);

                    return [
                        'order' => $order->fresh(['payment']),
                        'payment' => $payment->fresh(),
                    ];
                });

                /** @var Order $order */
                $order = $created['order'];
                /** @var Payment $payment */
                $payment = $created['payment'];

                return [
                    'ok' => true,
                    'order_id' => $order->id,
                    'payment_id' => $payment->id,
                    'order_status' => $order->status->value,
                    'payment_status' => $payment->status->value,
                    'total' => (float) $order->total,
                ];
            }
        );
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function confirmPayment(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];

        $targetStatus = PaymentStatus::from($input['status']);

        if (! in_array($targetStatus, [PaymentStatus::COMPLETED, PaymentStatus::FAILED], true)) {
            throw new UserError('Payment confirmation status must be COMPLETED or FAILED.');
        }

        return app(IdempotencyService::class)->execute(
            user: $user,
            operation: 'confirm_payment',
            requestPayload: $input,
            callback: function () use ($input, $targetStatus): array {
                $result = DB::transaction(function () use ($input, $targetStatus): array {
                    /** @var Payment|null $payment */
                    $payment = Payment::query()
                        ->with('order')
                        ->whereKey($input['payment_id'])
                        ->lockForUpdate()
                        ->first();

                    if (! $payment) {
                        throw new UserError('Payment not found.');
                    }

                    if (! $this->canTransitionPayment($payment->status, $targetStatus)) {
                        throw new UserError("Invalid payment transition: {$payment->status->value} -> {$targetStatus->value}");
                    }

                    $paymentData = [
                        'status' => $targetStatus,
                        'transaction_id' => $input['transaction_id'] ?? $payment->transaction_id,
                    ];

                    if ($targetStatus === PaymentStatus::COMPLETED) {
                        $paymentData['paid_at'] = now();
                    }

                    $payment->update($paymentData);

                    $payment->events()->create([
                        'event_type' => $targetStatus === PaymentStatus::COMPLETED
                            ? PaymentEventType::PAYMENT_COMPLETED->value
                            : PaymentEventType::PAYMENT_FAILED->value,
                        'timestamp' => now(),
                        'payload' => ['order_id' => $payment->order_id],
                    ]);

                    if ($targetStatus === PaymentStatus::COMPLETED && $payment->order->status === OrderStatus::PENDING) {
                        $payment->order->update(['status' => OrderStatus::CONFIRMED]);
                        $payment->order->events()->create([
                            'event_type' => OrderEventType::ORDER_CONFIRMED->value,
                            'timestamp' => now(),
                            'payload' => ['payment_id' => $payment->id],
                        ]);
                    }

                    if ($targetStatus === PaymentStatus::FAILED) {
                        $payment->order->update(['status' => OrderStatus::CANCELLED]);
                        $payment->order->events()->create([
                            'event_type' => OrderEventType::ORDER_CANCELLED->value,
                            'timestamp' => now(),
                            'payload' => ['payment_id' => $payment->id, 'reason' => 'PAYMENT_FAILED'],
                        ]);
                    }

                    return [
                        'payment' => $payment->fresh(),
                        'order' => $payment->order->fresh(),
                    ];
                });

                /** @var Payment $payment */
                $payment = $result['payment'];
                /** @var Order $order */
                $order = $result['order'];

                return [
                    'ok' => true,
                    'payment_id' => $payment->id,
                    'order_id' => $order->id,
                    'payment_status' => $payment->status->value,
                    'order_status' => $order->status->value,
                    'transaction_id' => $payment->transaction_id,
                ];
            }
        );
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function updateOrderItemStatus(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if (! in_array($user->user_type, [UserType::LOCAL_MANAGER, UserType::CHAIN_MANAGER], true)) {
            throw new UserError('Only restaurant managers can update order items.');
        }

        $input = $args['input'];
        $nextStatus = OrderItemStatus::from($input['status']);

        /** @var OrderItem|null $orderItem */
        $orderItem = OrderItem::query()
            ->with(['order.restaurant.localManager', 'order.restaurant.chain.chainManagers', 'order.items'])
            ->whereKey($input['order_item_id'])
            ->first();

        if (! $orderItem) {
            throw new UserError('Order item not found.');
        }

        if (! $this->canManageRestaurantOrder($user, $orderItem->order)) {
            throw new UserError('Not authorized to update this order item.');
        }

        $currentStatus = $orderItem->status;
        if (! $this->canTransitionOrderItem($currentStatus, $nextStatus)) {
            throw new UserError("Invalid order item transition: {$currentStatus->value} -> {$nextStatus->value}");
        }

        $courierNotificationUserId = null;
        DB::transaction(function () use ($orderItem, $nextStatus, &$courierNotificationUserId): void {
            $orderItem->update(['status' => $nextStatus]);

            $order = $orderItem->order->fresh(['items', 'delivery']);
            $statuses = $order->items->pluck('status');

            if ($statuses->every(fn ($status) => in_array($status->value, [OrderItemStatus::READY->value, OrderItemStatus::CANCELLED->value], true))) {
                $order->update(['status' => OrderStatus::READY]);
                $order->events()->create([
                    'event_type' => OrderEventType::ORDER_READY->value,
                    'timestamp' => now(),
                    'payload' => ['order_item_id' => $orderItem->id],
                ]);

                $courierNotificationUserId = $order->delivery?->courier_id;
            } elseif ($statuses->contains(fn ($status) => $status === OrderItemStatus::PREPARING)) {
                $order->update(['status' => OrderStatus::PREPARING]);
                $order->events()->create([
                    'event_type' => OrderEventType::ORDER_PREPARING->value,
                    'timestamp' => now(),
                    'payload' => ['order_item_id' => $orderItem->id],
                ]);
            }
        });

        if ($courierNotificationUserId) {
            $this->notificationService->createAndDispatch(
                userId: $courierNotificationUserId,
                type: NotificationType::ORDER_UPDATE,
                title: 'Pedido pronto para recolha',
                message: 'O restaurante marcou o pedido como pronto para recolha.',
                data: [
                    'order_id' => $orderItem->order_id,
                    'order_item_id' => $orderItem->id,
                ],
                actorId: $user->id
            );
        }

        $orderItem->refresh();
        $orderItem->load('order');

        return [
            'ok' => true,
            'order_item_id' => $orderItem->id,
            'order_id' => $orderItem->order_id,
            'order_item_status' => $orderItem->status->value,
            'order_status' => $orderItem->order->status->value,
        ];
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function reorder(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();

        if ($user->user_type !== UserType::CUSTOMER) {
            throw new UserError('Only customer users can reorder.');
        }

        /** @var Order|null $sourceOrder */
        $sourceOrder = Order::query()
            ->with(['items.options'])
            ->whereKey($args['input']['order_id'])
            ->where('user_id', $user->id)
            ->first();

        if (! $sourceOrder) {
            throw new UserError('Order not found.');
        }

        if ($sourceOrder->items->isEmpty()) {
            throw new UserError('Source order has no items.');
        }

        /** @var Cart $cart */
        $cart = Cart::query()->firstOrCreate(['user_id' => $user->id], ['total' => 0]);

        DB::transaction(function () use ($cart, $sourceOrder): void {
            $cart->items()->delete();

            foreach ($sourceOrder->items as $sourceItem) {
                $restaurantProduct = RestaurantProduct::query()
                    ->with('product')
                    ->whereKey($sourceItem->restaurant_product_id)
                    ->first();

                if (! $restaurantProduct || ! $restaurantProduct->is_available) {
                    throw new UserError("Product {$sourceItem->product_name_snapshot} is no longer available.");
                }

                $unitPrice = (float) ($restaurantProduct->local_price ?? $restaurantProduct->product?->price ?? 0);
                $quantity = max(1, (int) $sourceItem->quantity);
                $lineTotal = $unitPrice * $quantity;

                $cartItem = $cart->items()->create([
                    'restaurant_product_id' => $restaurantProduct->id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => $lineTotal,
                ]);

                foreach ($sourceItem->options as $option) {
                    if (! ProductOption::query()->whereKey($option->product_option_id)->exists()) {
                        continue;
                    }

                    $cartItem->options()->create([
                        'product_option_id' => $option->product_option_id,
                        'extra_price' => (float) $option->extra_price,
                    ]);
                }
            }
        });

        return $this->loadCartPayload($cart->id) ?? [
            'id' => $cart->id,
            'user_id' => $cart->user_id,
            'restaurant_id' => null,
            'total' => 0,
            'items' => [],
        ];
    }

    private function canManageRestaurantOrder(User $user, Order $order): bool
    {
        if ($user->user_type === UserType::LOCAL_MANAGER) {
            return $order->restaurant?->localManager?->user_id === $user->id;
        }

        if ($user->user_type === UserType::CHAIN_MANAGER) {
            return $order->restaurant?->chain?->chainManagers
                ?->contains(fn ($manager) => $manager->user_id === $user->id) ?? false;
        }

        return false;
    }

    private function canTransitionOrderItem(OrderItemStatus $from, OrderItemStatus $to): bool
    {
        return match ($from) {
            OrderItemStatus::PENDING => in_array($to, [OrderItemStatus::PREPARING, OrderItemStatus::CANCELLED], true),
            OrderItemStatus::PREPARING => in_array($to, [OrderItemStatus::READY, OrderItemStatus::CANCELLED], true),
            OrderItemStatus::READY, OrderItemStatus::CANCELLED => false,
        };
    }

    private function canTransitionPayment(PaymentStatus $from, PaymentStatus $to): bool
    {
        return match ($from) {
            PaymentStatus::PENDING => in_array($to, [PaymentStatus::COMPLETED, PaymentStatus::FAILED], true),
            PaymentStatus::COMPLETED => $to === PaymentStatus::REFUNDED,
            PaymentStatus::FAILED, PaymentStatus::REFUNDED => false,
        };
    }

    private function resolveCheckoutAddress(string $userId, ?string $addressId): ?UserAddress
    {
        if ($addressId) {
            return UserAddress::query()
                ->whereKey($addressId)
                ->where('user_id', $userId)
                ->first();
        }

        $default = UserAddress::query()
            ->where('user_id', $userId)
            ->where('is_default', true)
            ->first();

        if ($default) {
            return $default;
        }

        return UserAddress::query()
            ->where('user_id', $userId)
            ->orderBy('created_at')
            ->first();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadCartPayload(string $cartId): ?array
    {
        $cart = Cart::query()
            ->with(['items.restaurantProduct.product', 'items.options.productOption'])
            ->whereKey($cartId)
            ->first();

        if (! $cart) {
            return null;
        }

        $payload = $this->buildCartPayload($cart);
        $cart->update(['total' => $payload['total']]);

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildCartPayload(Cart $cart): array
    {
        $items = $cart->items->map(function ($item): array {
            $product = $item->restaurantProduct?->product;
            $basePrice = (float) ($item->unit_price ?? $item->restaurantProduct?->local_price ?? $product?->price ?? 0);
            $optionsTotal = $item->options->sum(fn ($option) => (float) ($option->productOption?->extra_price ?? 0));
            $lineTotal = ($basePrice + (float) $optionsTotal) * (int) $item->quantity;

            return [
                'id' => $item->id,
                'restaurant_product_id' => $item->restaurant_product_id,
                'product_name' => $product?->name ?? 'Produto',
                'quantity' => (int) $item->quantity,
                'unit_price' => $basePrice,
                'line_total' => $lineTotal,
            ];
        })->values()->all();

        $total = array_sum(array_map(fn ($item) => (float) $item['line_total'], $items));
        $restaurantId = $cart->items->first()?->restaurantProduct?->restaurant_id;

        return [
            'id' => $cart->id,
            'user_id' => $cart->user_id,
            'restaurant_id' => $restaurantId,
            'total' => $total,
            'items' => $items,
        ];
    }

    private function resolveAuthenticatedUser(): User
    {
        $user = auth()->user();

        if (! $user && app()->environment(['local', 'testing'])) {
            $devUserId = request()->header('X-Dev-User-Id');
            if ($devUserId) {
                $user = User::query()->find($devUserId);
            }
        }

        if (! $user) {
            throw new AuthenticationException('Authentication required.');
        }

        return $user;
    }
}
