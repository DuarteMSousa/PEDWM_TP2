<?php

namespace App\Repositories\DeliveryRepository;

use App\DTOs\Delivery\CreateDeliveryOfferDTO;
use App\DTOs\Delivery\CreateDeliveryEventDTO;
use App\DTOs\Delivery\UpdateDeliveryDTO;
use App\DTOs\Delivery\UpdateDeliveryOfferDTO;
use App\Enums\DeliveryOfferStatus;
use App\Enums\DeliveryStatus;
use App\Models\Delivery;
use App\Models\DeliveryOffer;

class DeliveryRepository implements DeliveryRepositoryInterface
{
    private array $deliveryDetails = ['order', 'courier.user', 'positionHistory', 'events', 'offers'];

    public function getById(string $id): ?Delivery
    {
        return Delivery::query()->with($this->deliveryDetails)->find($id);
    }

    public function getByOrderId(string $orderId): ?Delivery
    {
        return Delivery::query()->with($this->deliveryDetails)->where('order_id', $orderId)->first();
    }

    public function getActiveByCourierId(string $courierId): ?Delivery
    {
        return Delivery::query()
            ->with($this->deliveryDetails)
            ->where('courier_id', $courierId)
            ->whereNotIn('status', [DeliveryStatus::DELIVERED->value, DeliveryStatus::FAILED->value])
            ->first();
    }

    public function getByCourierId(string $courierId, ?array $statuses)
    {
        $query = Delivery::query()->with($this->deliveryDetails)->where('courier_id', $courierId);

        if ($statuses) {
            $query->whereIn('status', $statuses);
        }

        return $query->orderByDesc('created_at')->get();
    }

    public function getAssignmentCandidate(string $id): ?Delivery
    {
        return Delivery::query()
            ->with(['order.restaurant.address', 'offers'])
            ->find($id);
    }

    public function getByIdOrFail(string $id, bool $lock = false): Delivery
    {
        $query = Delivery::query();

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->findOrFail($id);
    }

    public function getByIdAndCourierIdOrFail(string $id, string $courierId, bool $lock = false): Delivery
    {
        $query = Delivery::query()->where('courier_id', $courierId);

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->findOrFail($id);
    }

    public function getOrCreateByOrderId(string $orderId, float $deliveryFee): Delivery
    {
        return Delivery::query()->firstOrCreate(
            ['order_id' => $orderId],
            ['status' => DeliveryStatus::PENDING->value, 'delivery_fee' => $deliveryFee]
        );
    }

    public function createOffer(CreateDeliveryOfferDTO $data): DeliveryOffer
    {
        return DeliveryOffer::query()->create([
            'delivery_id' => $data->deliveryId,
            'courier_id' => $data->courierId,
            'status' => $data->status->value,
            'expires_at' => $data->expiresAt,
        ]);
    }

    public function createEvent(Delivery $delivery, CreateDeliveryEventDTO $data): void
    {
        $delivery->events()->create([
            'event_type' => $data->eventType->value,
            'payload' => $data->payload,
            'created_at' => $data->createdAt,
        ]);
    }

    public function getOfferById(string $offerId): ?DeliveryOffer
    {
        return DeliveryOffer::query()->whereKey($offerId)->first();
    }

    public function getOfferByIdOrFail(string $offerId, bool $lock = false): DeliveryOffer
    {
        $query = DeliveryOffer::query();

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->findOrFail($offerId);
    }

    public function getPendingOfferByIdOrFail(string $offerId): DeliveryOffer
    {
        return DeliveryOffer::query()
            ->whereKey($offerId)
            ->where('status', DeliveryOfferStatus::PENDING->value)
            ->firstOrFail();
    }

    public function getPendingOffersByCourierId(string $courierId)
    {
        return DeliveryOffer::query()
            ->with(['delivery.order', 'delivery.positionHistory', 'courier.user'])
            ->where('courier_id', $courierId)
            ->where('status', DeliveryOfferStatus::PENDING->value)
            ->where('expires_at', '>', now())
            ->orderBy('expires_at')
            ->get();
    }

    public function updateDelivery(Delivery $delivery, UpdateDeliveryDTO $data): Delivery
    {
        $delivery->update(array_filter([
            'courier_id' => $data->courierId,
            'status' => $data->status?->value,
            'pickup_time' => $data->pickupTime,
            'delivery_time' => $data->deliveryTime,
        ], static fn ($value) => $value !== null));

        return $delivery;
    }

    public function updateOffer(DeliveryOffer $offer, UpdateDeliveryOfferDTO $data): DeliveryOffer
    {
        $offer->update(array_filter([
            'status' => $data->status?->value,
            'accepted_at' => $data->acceptedAt,
            'rejected_at' => $data->rejectedAt,
        ], static fn ($value) => $value !== null));

        return $offer;
    }

    public function expireOtherPendingOffers(string $deliveryId, string $acceptedOfferId): int
    {
        return DeliveryOffer::query()
            ->where('delivery_id', $deliveryId)
            ->where('id', '!=', $acceptedOfferId)
            ->where('status', DeliveryOfferStatus::PENDING->value)
            ->update(['status' => DeliveryOfferStatus::EXPIRED->value]);
    }
}
