<?php

namespace App\Repositories\DeliveryOfferRepository;

use Illuminate\Support\Facades\Cache;

class DeliveryOfferRepository implements DeliveryOfferRepositoryInterface
{
    public function getOffer(string $deliveryId, string $courierId): ?array
    {
        $value = Cache::get($this->getOfferKey($deliveryId, $courierId));

        return is_array($value) ? $value : null;
    }

    public function putOffer(string $deliveryId, string $courierId, array $offer, int $ttlSeconds): void
    {
        Cache::put($this->getOfferKey($deliveryId, $courierId), $offer, now()->addSeconds($ttlSeconds));
    }

    public function forgetOffer(string $deliveryId, string $courierId): void
    {
        Cache::forget($this->getOfferKey($deliveryId, $courierId));
    }

    public function getAttemptedCouriers(string $deliveryId): array
    {
        $value = Cache::get($this->getAttemptedCouriersKey($deliveryId), []);

        return is_array($value) ? array_values(array_unique(array_filter($value))) : [];
    }

    public function addAttemptedCourier(string $deliveryId, string $courierId, int $ttlSeconds): void
    {
        $attempted = $this->getAttemptedCouriers($deliveryId);
        $attempted[] = $courierId;
        Cache::put(
            $this->getAttemptedCouriersKey($deliveryId),
            array_values(array_unique($attempted)),
            now()->addSeconds($ttlSeconds)
        );
    }

    private function getOfferKey(string $deliveryId, string $courierId): string
    {
        return "delivery_offer:{$deliveryId}:{$courierId}";
    }

    private function getAttemptedCouriersKey(string $deliveryId): string
    {
        return "delivery_offer_attempted:{$deliveryId}";
    }
}

