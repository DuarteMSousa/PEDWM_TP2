<?php

namespace App\Services\DeliveryOfferService;

use App\Repositories\DeliveryOfferRepository\DeliveryOfferRepositoryInterface;
use Illuminate\Support\Str;

class DeliveryOfferService implements DeliveryOfferServiceInterface
{
    private const OFFER_TTL_SECONDS = 30;
    private const ATTEMPT_TTL_SECONDS = 600;

    public function __construct(private DeliveryOfferRepositoryInterface $repository)
    {
    }

    public function issueOffer(string $deliveryId, string $courierId): ?array
    {
        if (! $this->canCourierReceiveOffer($deliveryId, $courierId)) {
            return null;
        }

        $existing = $this->repository->getOffer($deliveryId, $courierId);
        if ($existing && isset($existing['token'], $existing['expires_at'])) {
            $expiresAt = (string) $existing['expires_at'];
            if (strtotime($expiresAt) > time()) {
                return [
                    'token' => (string) $existing['token'],
                    'expires_at' => $expiresAt,
                ];
            }

            // Expirou para este courier, avança para o próximo na rotação.
            $this->repository->addAttemptedCourier($deliveryId, $courierId, self::ATTEMPT_TTL_SECONDS);
            $this->repository->forgetOffer($deliveryId, $courierId);

            return null;
        }

        $offer = [
            'token' => (string) Str::uuid(),
            'expires_at' => now()->addSeconds(self::OFFER_TTL_SECONDS)->toIso8601String(),
        ];

        $this->repository->putOffer($deliveryId, $courierId, $offer, self::OFFER_TTL_SECONDS);

        return $offer;
    }

    public function validateOffer(string $deliveryId, string $courierId, string $offerToken): bool
    {
        $offer = $this->repository->getOffer($deliveryId, $courierId);
        if (! $offer) {
            return false;
        }

        $isSameToken = ($offer['token'] ?? null) === $offerToken;
        if (! $isSameToken) {
            return false;
        }

        $expiresAt = isset($offer['expires_at']) ? strtotime((string) $offer['expires_at']) : false;

        return $expiresAt !== false && $expiresAt > time();
    }

    public function consumeOffer(string $deliveryId, string $courierId): void
    {
        $this->repository->forgetOffer($deliveryId, $courierId);
        $this->repository->addAttemptedCourier($deliveryId, $courierId, self::ATTEMPT_TTL_SECONDS);
    }

    public function canCourierReceiveOffer(string $deliveryId, string $courierId): bool
    {
        $attemptedCouriers = $this->repository->getAttemptedCouriers($deliveryId);

        return ! in_array($courierId, $attemptedCouriers, true);
    }
}

