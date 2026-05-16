<?php

namespace App\Services\DeliveryService;

use App\Models\Delivery;
use App\Models\DeliveryOffer;

interface DeliveryServiceInterface
{
    public function find(string $id): ?Delivery;

    public function forOrder(string $orderId): ?Delivery;

    public function activeForCourier(string $courierId): ?Delivery;

    public function forCourier(string $courierId, ?array $statuses = null);

    public function offersForCourier(string $courierId);

    public function createForOrder(string $orderId, float $deliveryFee): Delivery;

    public function offerToCourier(string $deliveryId, string $courierId, int $ttlSeconds = 30): DeliveryOffer;

    public function acceptOffer(string $offerId): Delivery;

    public function rejectOffer(string $offerId): bool;

    public function markPickedUp(string $deliveryId, string $courierId): Delivery;

    public function markInTransit(string $deliveryId, string $courierId): Delivery;

    public function markDelivered(string $deliveryId, string $courierId): Delivery;

    public function markFailed(string $deliveryId, string $courierId, string $reason): Delivery;
}
