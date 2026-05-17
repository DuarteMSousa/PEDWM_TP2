<?php

namespace App\Services\OrderService;

use App\DTOs\Order\CheckoutDTO;
use App\Models\Cart;
use App\Models\Order;

interface OrderServiceInterface
{
    public function clientOrders(string $userId, ?array $statuses = null, int $page = 1, int $perPage = 20);

    public function clientOrder(string $userId, string $orderId): ?Order;

    public function restaurantOrders(string $restaurantId, ?array $statuses = null, int $page = 1, int $perPage = 20);

    public function restaurantActiveOrders(string $restaurantId);

    public function restaurantOrder(string $restaurantId, string $orderId): ?Order;

    public function events(string $orderId);

    public function checkout(string $clientUserId, CheckoutDTO $data): array;

    public function cancelByClient(string $userId, string $orderId, ?string $reason): Order;

    public function cancelBySystem(string $orderId, string $reason): Order;

    public function acceptByRestaurant(string $actorUserId, string $orderId): Order;

    public function rejectByRestaurant(string $actorUserId, string $orderId, ?string $reason): Order;

    public function startPreparing(string $actorUserId, string $orderId): Order;

    public function updateItemStatus(string $actorUserId, string $orderItemId, string $status): Order;

    public function markReady(string $actorUserId, string $orderId): Order;

    public function repeatOrder(string $userId, string $orderId): Cart;

    public function confirmAfterPayment(Order $order, string $actorUserId): Order;

    public function recordCourierAssigned(Order $order, string $actorUserId): Order;

    public function recordPickedUp(Order $order, string $actorUserId): Order;

    public function markOutForDelivery(Order $order, string $actorUserId): Order;

    public function markDelivered(Order $order, string $actorUserId): Order;
}
