<?php

namespace App\Services\OrderService;

use App\DTOs\Order\CheckoutDTO;
use App\Models\Cart;
use App\Models\Order;

interface OrderServiceInterface
{
    public function getClientOrders(string $userId, ?array $statuses = null, int $page = 1, int $perPage = 20);

    public function getClientOrder(string $userId, string $orderId): ?Order;

    public function getRestaurantOrders(string $restaurantId, ?array $statuses = null, int $page = 1, int $perPage = 20);

    public function getActiveRestaurantOrders(string $restaurantId);

    public function getRestaurantOrder(string $restaurantId, string $orderId): ?Order;

    public function getOrderEvents(string $orderId);

    public function checkoutOrder(string $clientUserId, CheckoutDTO $data): array;

    public function cancelOrderByClient(string $userId, string $orderId, ?string $reason): Order;

    public function cancelOrderBySystem(string $orderId, string $reason): Order;

    public function acceptOrderByRestaurant(string $actorUserId, string $orderId): Order;

    public function rejectOrderByRestaurant(string $actorUserId, string $orderId, ?string $reason): Order;

    public function startPreparingOrder(string $actorUserId, string $orderId): Order;

    public function updateOrderItemStatus(string $actorUserId, string $orderItemId, string $status): Order;

    public function markOrderReady(string $actorUserId, string $orderId): Order;

    public function repeatClientOrder(string $userId, string $orderId): Cart;

    public function confirmOrderAfterPayment(Order $order, string $actorUserId): Order;

    public function recordCourierAssignedToOrder(Order $order, string $actorUserId): Order;

    public function recordOrderPickedUp(Order $order, string $actorUserId): Order;

    public function markOrderOutForDelivery(Order $order, string $actorUserId): Order;

    public function markOrderDelivered(Order $order, string $actorUserId): Order;
}
