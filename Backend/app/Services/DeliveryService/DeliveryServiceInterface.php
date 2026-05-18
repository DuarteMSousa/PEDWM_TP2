<?php

namespace App\Services\DeliveryService;

use App\Models\Delivery;
use App\Models\DeliveryOffer;

interface DeliveryServiceInterface
{
    public function getDeliveryById(string $id): ?Delivery;

    public function getDeliveryByOrderId(string $orderId): ?Delivery;

    public function getActiveDeliveryByCourierId(string $courierId): ?Delivery;

    public function getDeliveriesByCourierId(string $courierId, ?array $statuses = null);

    public function getDeliveryOffersByCourierId(string $courierId);

    public function createDeliveryForOrder(string $orderId, float $deliveryFee): Delivery;

    public function createDeliveryOfferForCourier(string $deliveryId, string $courierId, int $ttlSeconds = 30): DeliveryOffer;

    public function acceptDeliveryOffer(string $offerId): Delivery;

    public function rejectDeliveryOffer(string $offerId): bool;

    public function markDeliveryPickedUp(string $deliveryId, string $courierId): Delivery;

    public function markDeliveryInTransit(string $deliveryId, string $courierId): Delivery;

    public function markDeliveryDelivered(string $deliveryId, string $courierId): Delivery;

    public function markDeliveryFailed(string $deliveryId, string $courierId, string $reason): Delivery;

    public function markDeliveryFailedBySystem(string $deliveryId, string $reason): Delivery;
}
