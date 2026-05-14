<?php

namespace App\Services\DeliveryOfferService;

interface DeliveryOfferServiceInterface
{
    /**
     * @return array{token: string, expires_at: string}|null
     */
    public function issueOffer(string $deliveryId, string $courierId): ?array;

    public function validateOffer(string $deliveryId, string $courierId, string $offerToken): bool;

    public function consumeOffer(string $deliveryId, string $courierId): void;

    public function canCourierReceiveOffer(string $deliveryId, string $courierId): bool;
}

