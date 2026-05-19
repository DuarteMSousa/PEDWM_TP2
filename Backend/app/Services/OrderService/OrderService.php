<?php

namespace App\Services\OrderService;

use App\Aspects\Transactional;
use App\Domain\Geo\GeoMath;
use App\Domain\Orders\OrderItemRules;
use App\Domain\StateMachines\Orders\OrderStateFactory;
use App\DTOs\Order\CheckoutDTO;
use App\Enums\OrderEventType;
use App\Enums\OrderItemStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentEventType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\NotificationEventRecorded;
use App\Jobs\AssignCourierToDeliveryJob;
use App\Jobs\ExpirePendingPaymentJob;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Restaurant;
use App\Models\UserAddress;
use App\Services\CartService\CartServiceInterface;
use App\Services\DeliveryService\DeliveryServiceInterface;
use App\Services\OrderPricingService;
use App\Services\OutboxService;
use App\Services\PaymentService\PaymentServiceInterface;
use BackedEnum;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrderService implements OrderServiceInterface
{
    private array $with = [
        'items.options',
        'address',
        'events',
        'discounts',
        'payment.events',
        'delivery.events',
    ];

    public function getClientOrders(string $userId, ?array $statuses = null, int $page = 1, int $perPage = 20)
    {
        $query = Order::query()
            ->with($this->with)
            ->where('user_id', $userId)
            ->orderByDesc('created_at');

        if ($statuses) {
            $query->whereIn('status', $statuses);
        }

        return $query->paginate($perPage, ['*'], 'page', $page)->items();
    }

    public function getClientOrder(string $userId, string $orderId): ?Order
    {
        return Order::query()
            ->with($this->with)
            ->where('user_id', $userId)
            ->find($orderId);
    }

    public function getRestaurantOrders(string $restaurantId, ?array $statuses = null, int $page = 1, int $perPage = 20)
    {
        $query = Order::query()
            ->with($this->with)
            ->where('restaurant_id', $restaurantId)
            ->orderByDesc('created_at');

        if ($statuses) {
            $query->whereIn('status', $statuses);
        }

        return $query->paginate($perPage, ['*'], 'page', $page)->items();
    }

    public function getActiveRestaurantOrders(string $restaurantId)
    {
        return Order::query()
            ->with($this->with)
            ->where('restaurant_id', $restaurantId)
            ->whereNotIn('status', [OrderStatus::DELIVERED->value, OrderStatus::CANCELLED->value])
            ->orderBy('created_at')
            ->get();
    }

    public function getRestaurantOrder(string $restaurantId, string $orderId): ?Order
    {
        return Order::query()
            ->with($this->with)
            ->where('restaurant_id', $restaurantId)
            ->find($orderId);
    }

    public function getOrderEvents(string $orderId)
    {
        return OrderEvent::query()
            ->where('order_id', $orderId)
            ->orderBy('timestamp')
            ->get();
    }

    #[Transactional]
    public function checkoutOrder(string $clientUserId, CheckoutDTO $data): array
    {
        $cart = Cart::query()
            ->with(['items.restaurantProduct.product.category', 'items.options.productOption'])
            ->where('user_id', $clientUserId)
            ->when($data->cart_id, fn($query, $cartId) => $query->whereKey($cartId))
            ->firstOrFail();

        if ($cart->items->isEmpty()) {
            throw new \RuntimeException('Cart is empty.');
        }

        $firstRestaurantProduct = $cart->items->first()->restaurantProduct;
        $restaurant = $firstRestaurantProduct->restaurant()->firstOrFail();
        $address = $this->validatedCheckoutAddress($clientUserId, $data->address_id);
        $this->validateCheckoutCart($cart, $restaurant->id, $address);

        $pricing = app(OrderPricingService::class)->price($cart, $restaurant, $address, $data->coupon_code);
        $method = $data->payment_method;
        $paymentStatus = $method === PaymentMethod::CASH ? PaymentStatus::COMPLETED : PaymentStatus::PENDING;
        $orderStatus = $paymentStatus === PaymentStatus::COMPLETED ? OrderStatus::CONFIRMED : OrderStatus::PENDING;

        $order = Order::query()->create([
            'user_id' => $clientUserId,
            'restaurant_id' => $restaurant->id,
            'status' => $orderStatus->value,
            'total' => $pricing['total'],
            'restaurant_name_snapshot' => $restaurant->name,
        ]);

        $cartItemToOrderItem = [];
        foreach ($cart->items as $cartItem) {
            $orderItem = $order->items()->create([
                'restaurant_product_id' => $cartItem->restaurant_product_id,
                'status' => OrderItemStatus::PENDING->value,
                'quantity' => $cartItem->quantity,
                'unit_price' => $cartItem->unit_price,
                'product_name_snapshot' => $cartItem->restaurantProduct->product->name,
                'total_price' => $cartItem->total_price,
            ]);
            $cartItemToOrderItem[$cartItem->id] = $orderItem->id;

            foreach ($cartItem->options as $cartOption) {
                $orderItem->options()->create([
                    'product_option_id' => $cartOption->product_option_id,
                    'option_name_snapshot' => $cartOption->productOption->name,
                    'extra_price' => $cartOption->extra_price,
                ]);
            }
        }

        foreach ($pricing['discounts'] as $discount) {
            $order->discounts()->create([
                'name_snapshot' => $discount['name_snapshot'],
                'description_snapshot' => $discount['description_snapshot'] ?? null,
                'discount_amount' => $discount['discount_amount'],
                'discount_type' => $discount['discount_type'],
                'discount_target' => $discount['discount_target'],
                'order_item_id' => isset($discount['cart_item_id'])
                    ? ($cartItemToOrderItem[$discount['cart_item_id']] ?? null)
                    : null,
                'origin_type' => $discount['origin_type'],
                'origin_id' => $discount['origin_id'],
            ]);
        }

        $order->address()->create([
            'street' => $address->street,
            'city' => $address->city,
            'postal_code' => $address->postal_code,
            'country' => $address->country,
            'latitude' => $address->latitude,
            'longitude' => $address->longitude,
        ]);

        $payment = $order->payment()->create([
            'method' => $method->value,
            'status' => $paymentStatus->value,
            'amount' => $pricing['total'],
            'paid_at' => $paymentStatus === PaymentStatus::COMPLETED ? now() : null,
            'expired_at' => $paymentStatus === PaymentStatus::PENDING ? now()->addMinutes(10) : null,
        ]);

        $this->recordEvent($order, OrderEventType::ORDER_CREATED, $clientUserId, [
            'paymentStatus' => $paymentStatus->value,
        ]);
        if ($orderStatus === OrderStatus::CONFIRMED) {
            $this->recordEvent($order, OrderEventType::ORDER_PAYMENT_COMPLETED, $clientUserId);
            $this->recordEvent($order, OrderEventType::ORDER_CONFIRMED, $clientUserId);
        }

        $payment->events()->create([
            'event_type' => PaymentEventType::PAYMENT_CREATED->value,
            'timestamp' => now(),
            'payload' => ['actor_user_id' => $clientUserId],
        ]);

        if ($paymentStatus === PaymentStatus::COMPLETED) {
            $payment->events()->create([
                'event_type' => PaymentEventType::PAYMENT_COMPLETED->value,
                'timestamp' => now(),
                'payload' => ['actor_user_id' => $clientUserId],
            ]);
        } else {
            ExpirePendingPaymentJob::dispatch($payment->id)
                ->delay($payment->expired_at)
                ->afterCommit();
        }
        $cart->items()->delete();
        $cart->update(['total' => 0]);

        return [
            'order' => $order->load($this->with),
            'payment' => $payment->refresh()->load('events'),
        ];
    }

    #[Transactional]
    public function cancelOrderByClient(string $userId, string $orderId, ?string $reason): Order
    {
        $order = Order::query()->where('user_id', $userId)->findOrFail($orderId);

        if ($order->status === OrderStatus::CANCELLED) {
            return $order->load($this->with);
        }

        $order = $this->transition($order, OrderStatus::CANCELLED, OrderEventType::ORDER_CANCELLED, $userId, ['reason' => $reason]);
        $this->cancelPaymentForOrder($order->id, $reason ?? 'order cancelled by client');

        return $order->refresh()->load($this->with);
    }

    #[Transactional]
    public function cancelOrderBySystem(string $orderId, string $reason): Order
    {
        $order = Order::query()->findOrFail($orderId);

        if (in_array($order->status, [OrderStatus::DELIVERED, OrderStatus::CANCELLED], true)) {
            return $order->load($this->with);
        }

        $order = $this->transition($order, OrderStatus::CANCELLED, OrderEventType::ORDER_CANCELLED, 'system', [
            'reason' => $reason,
        ]);
        $this->cancelPaymentForOrder($order->id, $reason);

        return $order->refresh()->load($this->with);
    }

    #[Transactional]
    public function acceptOrderByRestaurant(string $actorUserId, string $orderId): Order
    {
        $order = Order::query()->findOrFail($orderId);

        $order = $this->transition($order, OrderStatus::PREPARING, OrderEventType::ORDER_PREPARING, $actorUserId);
        $order->loadMissing(['restaurant.address', 'address']);
        $deliveryFee = app(OrderPricingService::class)->deliveryFee($order->restaurant, $order->address);
        $delivery = app(DeliveryServiceInterface::class)->createDeliveryForOrder($order->id, $deliveryFee);
        AssignCourierToDeliveryJob::dispatch($delivery->id)->afterCommit();

        return $order;
    }

    #[Transactional]
    public function rejectOrderByRestaurant(string $actorUserId, string $orderId, ?string $reason): Order
    {
        $order = Order::query()->findOrFail($orderId);

        $this->recordEvent($order, OrderEventType::ORDER_REJECTED, $actorUserId, ['reason' => $reason]);
        $order = $this->transition($order, OrderStatus::CANCELLED, OrderEventType::ORDER_CANCELLED, $actorUserId, ['reason' => $reason]);
        $this->cancelPaymentForOrder($order->id, $reason ?? 'order rejected by restaurant');

        return $order->refresh()->load($this->with);
    }

    #[Transactional]
    public function startPreparingOrder(string $actorUserId, string $orderId): Order
    {
        $order = Order::query()->findOrFail($orderId);

        $order = $this->transition($order, OrderStatus::PREPARING, OrderEventType::ORDER_PREPARING, $actorUserId);
        $order->loadMissing(['restaurant.address', 'address']);
        $deliveryFee = app(OrderPricingService::class)->deliveryFee($order->restaurant, $order->address);
        $delivery = app(DeliveryServiceInterface::class)->createDeliveryForOrder($order->id, $deliveryFee);
        AssignCourierToDeliveryJob::dispatch($delivery->id)->afterCommit();

        return $order;
    }

    #[Transactional]
    public function updateOrderItemStatus(string $actorUserId, string $orderItemId, string $status): Order
    {
        $item = OrderItem::query()->with('order.items')->findOrFail($orderItemId);
        $item->update(['status' => $status]);
        $order = $item->order->refresh()->load('items');

        $statuses = $order->items->pluck('status');
        $isAllReady = true;

        foreach ($statuses as $status) {
            $value = $status instanceof BackedEnum ? $status->value : $status;

            if ($value !== OrderItemStatus::READY->value) {
                 $isAllReady = false;
            }
        }

        if ($isAllReady) {
            return $this->transition($order, OrderStatus::READY, OrderEventType::ORDER_READY, $actorUserId);
        }

        return $order->load($this->with);
    }

    #[Transactional]
    public function markOrderReady(string $actorUserId, string $orderId): Order
    {
        $order = Order::query()->findOrFail($orderId);

        return $this->transition($order, OrderStatus::READY, OrderEventType::ORDER_READY, $actorUserId);
    }

    #[Transactional]
    public function repeatClientOrder(string $userId, string $orderId): Cart
    {
        $order = Order::query()->with('items.options')->where('user_id', $userId)->findOrFail($orderId);
        $cart = app(CartServiceInterface::class)->getCartByUserId($userId);
        $cart->items()->delete();

        foreach ($order->items as $item) {
            $cartItem = $cart->items()->create([
                'restaurant_product_id' => $item->restaurant_product_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total_price' => $item->total_price,
            ]);

            foreach ($item->options as $option) {
                $cartItem->options()->create([
                    'product_option_id' => $option->product_option_id,
                    'extra_price' => $option->extra_price,
                ]);
            }
        }

        return app(CartServiceInterface::class)->recalculateCartTotal($cart->id);
    }

    #[Transactional]
    public function markOrderOutForDelivery(Order $order, string $actorUserId): Order
    {
        return $this->transition($order, OrderStatus::OUT_FOR_DELIVERY, OrderEventType::ORDER_OUT_FOR_DELIVERY, $actorUserId);
    }

    #[Transactional]
    public function markOrderDelivered(Order $order, string $actorUserId): Order
    {
        return $this->transition($order, OrderStatus::DELIVERED, OrderEventType::ORDER_DELIVERED, $actorUserId);
    }

    #[Transactional]
    public function confirmOrderAfterPayment(Order $order, string $actorUserId): Order
    {
        $this->recordEvent($order, OrderEventType::ORDER_PAYMENT_COMPLETED, $actorUserId);

        return $this->transition($order, OrderStatus::CONFIRMED, OrderEventType::ORDER_CONFIRMED, $actorUserId);
    }

    #[Transactional]
    public function recordCourierAssignedToOrder(Order $order, string $actorUserId): Order
    {
        $this->recordEvent($order, OrderEventType::ORDER_COURIER_ASSIGNED, $actorUserId);

        return $order->refresh()->load($this->with);
    }

    #[Transactional]
    public function recordOrderPickedUp(Order $order, string $actorUserId): Order
    {
        $this->recordEvent($order, OrderEventType::ORDER_PICKED_UP, $actorUserId);

        return $order->refresh()->load($this->with);
    }

    private function transition(Order $order, OrderStatus $status, OrderEventType $eventType, string $actorUserId, array $payload = []): Order
    {
        $order = Order::query()->lockForUpdate()->findOrFail($order->id);
        OrderStateFactory::from($order->status)->transition($order, $status);
        $this->recordEvent($order, $eventType, $actorUserId, $payload);

        return $order->refresh()->load($this->with);
    }

    private function validatedCheckoutAddress(string $clientUserId, ?string $addressId): UserAddress
    {
        if ($addressId === null) {
            throw ValidationException::withMessages([
                'address_id' => 'Checkout requires a delivery address.',
            ]);
        }

        return UserAddress::query()
            ->where('user_id', $clientUserId)
            ->findOrFail($addressId);
    }

    private function validateCheckoutCart(Cart $cart, string $restaurantId, UserAddress $address): void
    {
        $cart->loadMissing(['items.restaurantProduct.restaurant.address']);

        foreach ($cart->items as $item) {
            if (! $item->restaurantProduct?->is_available) {
                throw ValidationException::withMessages([
                    'cart' => 'Cart contains an unavailable product.',
                ]);
            }

            if ($item->restaurantProduct?->restaurant_id !== $restaurantId) {
                throw ValidationException::withMessages([
                    'cart' => 'Cart can only contain products from one restaurant.',
                ]);
            }
        }

        $restaurant = $cart->items->first()?->restaurantProduct?->restaurant;
        $restaurantAddress = $restaurant?->address;

        if (! $restaurantAddress) {
            throw ValidationException::withMessages([
                'restaurant_id' => 'Restaurant has no pickup address configured.',
            ]);
        }

        if (! $this->isRestaurantOpenNow($restaurant)) {
            throw ValidationException::withMessages([
                'restaurant_id' => 'Restaurant is closed at this time.',
            ]);
        }

        $distanceKm = GeoMath::distanceKm(
            (float) $restaurantAddress->latitude,
            (float) $restaurantAddress->longitude,
            (float) $address->latitude,
            (float) $address->longitude
        );

        if ($restaurant->delivery_radius !== null && $distanceKm > (float) $restaurant->delivery_radius) {
            throw ValidationException::withMessages([
                'address_id' => 'Delivery address is outside the restaurant delivery radius.',
            ]);
        }
    }

    private function cancelPaymentForOrder(string $orderId, string $reason): void
    {
        $payment = Payment::query()->where('order_id', $orderId)->first();

        if (! $payment) {
            return;
        }

        if (in_array($payment->status, [PaymentStatus::FAILED, PaymentStatus::CANCELLED], true)) {
            return;
        }

        app(PaymentServiceInterface::class)->cancelPayment($payment->id, $reason, cascadeToOrder: false);
    }

    private function isRestaurantOpenNow(Restaurant $restaurant): bool
    {
        if (! $restaurant->opening_hours || ! $restaurant->closing_hours) {
            return true;
        }

        try {
            $now = Carbon::now();
            $today = $now->copy()->startOfDay();
            $opening = $today->copy()->setTimeFromTimeString($restaurant->opening_hours);
            $closing = $today->copy()->setTimeFromTimeString($restaurant->closing_hours);
        } catch (\Throwable) {
            return true;
        }

        if ($closing->lessThanOrEqualTo($opening)) {
            return $now->greaterThanOrEqualTo($opening) || $now->lessThan($closing);
        }

        return $now->greaterThanOrEqualTo($opening) && $now->lessThan($closing);
    }

    private function recordEvent(Order $order, OrderEventType $eventType, string $actorUserId, array $payload = []): void
    {
        $occurredAt = now();
        $eventPayload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => $eventType->value,
            'aggregateType' => 'order',
            'aggregateId' => $order->id,
            'orderId' => $order->id,
            'customerId' => $order->user_id,
            'restaurantId' => $order->restaurant_id,
            'restaurantName' => $order->restaurant_name_snapshot,
            'actorId' => $actorUserId,
            'occurredAt' => $occurredAt->toIso8601String(),
            'data' => $payload,
            'channels' => [
                "customer.{$order->user_id}.orders",
                "restaurant.{$order->restaurant_id}.orders",
                "order.{$order->id}.tracking",
            ],
        ];

        $order->events()->create([
            'event_type' => $eventType->value,
            'timestamp' => $occurredAt,
            'payload' => $eventPayload,
        ]);

        app(OutboxService::class)->enqueue('order', $order->id, $eventType->value, $eventPayload);
        NotificationEventRecorded::dispatch($eventType, $eventPayload);
    }
}
