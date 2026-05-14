<?php

namespace App\Repositories\DeliveryOfferRepository;

interface DeliveryOfferRepositoryInterface
{
    /**
     * @return array<string, mixed>|null
     */
    public function getOffer(string $deliveryId, string $courierId): ?array;

    /**
     * @param  array<string, mixed>  $offer
     */
    public function putOffer(string $deliveryId, string $courierId, array $offer, int $ttlSeconds): void;

    public function forgetOffer(string $deliveryId, string $courierId): void;

    /**
     * @return array<int, string>
     */
    public function getAttemptedCouriers(string $deliveryId): array;

    public function addAttemptedCourier(string $deliveryId, string $courierId, int $ttlSeconds): void;
}

