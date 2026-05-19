<?php

namespace App\Repositories\DeliveryRepository;

use App\DTOs\Delivery\CreateDeliveryOfferDTO;
use App\DTOs\Delivery\CreateDeliveryEventDTO;
use App\DTOs\Delivery\UpdateDeliveryDTO;
use App\DTOs\Delivery\UpdateDeliveryOfferDTO;
use App\Enums\DeliveryStatus;
use App\Models\Delivery;
use App\Models\DeliveryOffer;

interface DeliveryRepositoryInterface
{
    public function getById(string $id): ?Delivery;

    public function getByOrderId(string $orderId): ?Delivery;

    public function getActiveByCourierId(string $courierId): ?Delivery;

    public function getByCourierId(string $courierId, ?array $statuses);

    public function getAssignmentCandidate(string $id): ?Delivery;

    public function getByIdOrFail(string $id, bool $lock = false): Delivery;

    public function getByIdAndCourierIdOrFail(string $id, string $courierId, bool $lock = false): Delivery;

    public function getOrCreateByOrderId(string $orderId, float $deliveryFee): Delivery;

    public function createOffer(CreateDeliveryOfferDTO $data): DeliveryOffer;

    public function createEvent(Delivery $delivery, CreateDeliveryEventDTO $data): void;

    public function getOfferById(string $offerId): ?DeliveryOffer;

    public function getOfferByIdOrFail(string $offerId, bool $lock = false): DeliveryOffer;

    public function getPendingOfferByIdOrFail(string $offerId): DeliveryOffer;

    public function getPendingOffersByCourierId(string $courierId);

    public function updateDelivery(Delivery $delivery, UpdateDeliveryDTO $data): Delivery;

    public function updateOffer(DeliveryOffer $offer, UpdateDeliveryOfferDTO $data): DeliveryOffer;

    public function expireOtherPendingOffers(string $deliveryId, string $acceptedOfferId): int;
}
