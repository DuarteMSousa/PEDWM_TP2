<?php

namespace App\Services\DeliveryService;

use App\Aspects\Transactional;
use App\Domain\StateMachines\Deliveries\DeliveryStateFactory;
use App\Enums\CourierStatus;
use App\Enums\DeliveryEventType;
use App\Enums\DeliveryOfferEventType;
use App\Enums\DeliveryOfferStatus;
use App\Enums\DeliveryStatus;
use App\Events\NotificationEventRecorded;
use App\Jobs\AssignCourierToDeliveryJob;
use App\Jobs\ExpireDeliveryOfferJob;
use App\Models\Delivery;
use App\Models\DeliveryOffer;
use App\Services\CourierService\CourierServiceInterface;
use App\Services\OrderService\OrderServiceInterface;
use App\Services\OutboxService;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DeliveryService implements DeliveryServiceInterface
{
    private array $with = ['order', 'courier.user', 'positionHistory', 'events', 'offers'];

    public function getDeliveryById(string $id): ?Delivery
    {
        return Delivery::query()->with($this->with)->find($id);
    }

    public function getDeliveryByOrderId(string $orderId): ?Delivery
    {
        return Delivery::query()->with($this->with)->where('order_id', $orderId)->first();
    }

    public function getActiveDeliveryByCourierId(string $courierId): ?Delivery
    {
        return Delivery::query()
            ->with($this->with)
            ->where('courier_id', $courierId)
            ->whereNotIn('status', [DeliveryStatus::DELIVERED->value, DeliveryStatus::FAILED->value])
            ->first();
    }

    public function getDeliveriesByCourierId(string $courierId, ?array $statuses = null)
    {
        $query = Delivery::query()->with($this->with)->where('courier_id', $courierId);

        if ($statuses) {
            $query->whereIn('status', $statuses);
        }

        return $query->orderByDesc('created_at')->get();
    }

    public function getDeliveryOffersByCourierId(string $courierId)
    {
        return DeliveryOffer::query()
            ->with(['delivery.order', 'delivery.positionHistory', 'courier.user'])
            ->where('courier_id', $courierId)
            ->where('status', DeliveryOfferStatus::PENDING->value)
            ->where('expires_at', '>', now())
            ->orderBy('expires_at')
            ->get();
    }

    #[Transactional]
    public function createDeliveryForOrder(string $orderId, float $deliveryFee): Delivery
    {
        return Delivery::query()->firstOrCreate(
            ['order_id' => $orderId],
            ['status' => DeliveryStatus::PENDING->value, 'delivery_fee' => $deliveryFee]
        )->load($this->with);
    }

    #[Transactional]
    public function createDeliveryOfferForCourier(string $deliveryId, string $courierId, int $ttlSeconds = 30): DeliveryOffer
    {
        $offer = DeliveryOffer::query()->create([
            'delivery_id' => $deliveryId,
            'courier_id' => $courierId,
            'status' => DeliveryOfferStatus::PENDING->value,
            'expires_at' => now()->addSeconds($ttlSeconds),
        ]);

        $this->broadcastJobEvent(DeliveryOfferEventType::JOB_OFFERED, $offer);
        ExpireDeliveryOfferJob::dispatch($offer->id)
            ->delay($offer->expires_at)
            ->afterCommit();

        return $offer->load(['delivery.order', 'courier.user']);
    }

    #[Transactional]
    public function acceptDeliveryOffer(string $offerId): Delivery
    {
        $offer = DeliveryOffer::query()
            ->with(['delivery.order', 'courier'])
            ->whereKey($offerId)
            ->lockForUpdate()
            ->firstOrFail();

        if ($offer->status !== DeliveryOfferStatus::PENDING) {
            throw ValidationException::withMessages(['offer_id' => 'Offer is not pending.']);
        }

        if ($offer->expires_at->isPast()) {
            $offer->update(['status' => DeliveryOfferStatus::EXPIRED->value]);
            $this->broadcastJobEvent(DeliveryOfferEventType::JOB_EXPIRED, $offer);

            throw ValidationException::withMessages(['offer_id' => 'Offer expired.']);
        }

        $delivery = Delivery::query()->whereKey($offer->delivery_id)->lockForUpdate()->firstOrFail();

        if ($delivery->courier_id !== null && $delivery->courier_id !== $offer->courier_id) {
            throw ValidationException::withMessages(['delivery_id' => 'Delivery already assigned.']);
        }

        if ($offer->courier->status !== CourierStatus::AVAILABLE) {
            throw ValidationException::withMessages(['courier_id' => 'Courier is not available.']);
        }

        $offer->update([
            'status' => DeliveryOfferStatus::ACCEPTED->value,
            'accepted_at' => now(),
        ]);

        $delivery->update(['courier_id' => $offer->courier_id]);
        DeliveryOffer::query()
            ->where('delivery_id', $delivery->id)
            ->where('id', '!=', $offer->id)
            ->where('status', DeliveryOfferStatus::PENDING->value)
            ->update(['status' => DeliveryOfferStatus::EXPIRED->value]);

        app(CourierServiceInterface::class)->updateCourierStatus($offer->courier_id, CourierStatus::BUSY->value);
        $this->recordEvent($delivery, DeliveryEventType::DELIVERY_ACCEPTED, $offer->courier_id);
        app(OrderServiceInterface::class)->recordCourierAssignedToOrder($delivery->order, $offer->courier_id);
        $this->broadcastJobEvent(DeliveryOfferEventType::JOB_ACCEPTED, $offer);

        return $delivery->refresh()->load($this->with);
    }

    #[Transactional]
    public function rejectDeliveryOffer(string $offerId): bool
    {
        $offer = DeliveryOffer::query()
            ->with('delivery')
            ->whereKey($offerId)
            ->where('status', DeliveryOfferStatus::PENDING->value)
            ->firstOrFail();

        $offer->update([
            'status' => DeliveryOfferStatus::REJECTED->value,
            'rejected_at' => now(),
        ]);
        $this->broadcastJobEvent(DeliveryOfferEventType::JOB_REJECTED, $offer);
        AssignCourierToDeliveryJob::dispatch($offer->delivery_id)->afterCommit();

        return true;
    }

    #[Transactional]
    public function markDeliveryPickedUp(string $deliveryId, string $courierId): Delivery
    {
        $delivery = $this->transitionDeliveryStatus($deliveryId, $courierId, DeliveryStatus::PICKED_UP, ['pickup_time' => now()]);
        app(OrderServiceInterface::class)->recordOrderPickedUp($delivery->order, $courierId);

        return $delivery->refresh()->load($this->with);
    }

    #[Transactional]
    public function markDeliveryInTransit(string $deliveryId, string $courierId): Delivery
    {
        $delivery = $this->transitionDeliveryStatus($deliveryId, $courierId, DeliveryStatus::IN_TRANSIT);
        app(OrderServiceInterface::class)->markOrderOutForDelivery($delivery->order, $courierId);

        return $delivery->refresh()->load($this->with);
    }

    #[Transactional]
    public function markDeliveryDelivered(string $deliveryId, string $courierId): Delivery
    {
        $delivery = $this->transitionDeliveryStatus($deliveryId, $courierId, DeliveryStatus::DELIVERED, ['delivery_time' => now()]);
        app(OrderServiceInterface::class)->markOrderDelivered($delivery->order, $courierId);
        app(CourierServiceInterface::class)->updateCourierStatus($courierId, CourierStatus::AVAILABLE->value);

        return $delivery->refresh()->load($this->with);
    }

    #[Transactional]
    public function markDeliveryFailed(string $deliveryId, string $courierId, string $reason): Delivery
    {
        $delivery = $this->transitionDeliveryStatus($deliveryId, $courierId, DeliveryStatus::FAILED, ['failure_reason' => $reason]);

        return $delivery;
    }

    #[Transactional]
    public function markDeliveryFailedBySystem(string $deliveryId, string $reason): Delivery
    {
        $delivery = Delivery::query()
            ->with('order')
            ->whereKey($deliveryId)
            ->lockForUpdate()
            ->firstOrFail();

        if ($delivery->status === DeliveryStatus::FAILED || $delivery->status === DeliveryStatus::DELIVERED) {
            return $delivery->load($this->with);
        }

        DeliveryStateFactory::from($delivery->status)->transition($delivery, DeliveryStatus::FAILED);
        $this->recordEvent($delivery->refresh(), DeliveryEventType::DELIVERY_FAILED, 'system', [
            'reason' => $reason,
        ]);

        app(OrderServiceInterface::class)->cancelOrderBySystem($delivery->order_id, $reason);

        return $delivery->refresh()->load($this->with);
    }

    private function transitionDeliveryStatus(string $deliveryId, string $courierId, DeliveryStatus $status, array $extra = []): Delivery
    {
        $delivery = Delivery::query()
            ->where('courier_id', $courierId)
            ->lockForUpdate()
            ->findOrFail($deliveryId);
        DeliveryStateFactory::from($delivery->status)->transition($delivery, $status, $extra);
        $this->recordEvent($delivery, $this->eventTypeForStatus($status), $courierId, $extra);

        return $delivery->refresh()->load($this->with);
    }

    private function eventTypeForStatus(DeliveryStatus $status): DeliveryEventType
    {
        return match ($status) {
            DeliveryStatus::PICKED_UP => DeliveryEventType::DELIVERY_PICKED_UP,
            DeliveryStatus::IN_TRANSIT => DeliveryEventType::DELIVERY_IN_TRANSIT,
            DeliveryStatus::DELIVERED => DeliveryEventType::DELIVERY_DELIVERED,
            DeliveryStatus::FAILED => DeliveryEventType::DELIVERY_FAILED,
            DeliveryStatus::PENDING => DeliveryEventType::DELIVERY_ACCEPTED,
        };
    }

    private function recordEvent(Delivery $delivery, DeliveryEventType $eventType, string $actorUserId, array $payload = []): void
    {
        $delivery->loadMissing('order');
        $occurredAt = now();
        $eventPayload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => $eventType->value,
            'aggregateType' => 'delivery',
            'aggregateId' => $delivery->id,
            'deliveryId' => $delivery->id,
            'orderId' => $delivery->order_id,
            'customerId' => $delivery->order?->user_id,
            'courierId' => $delivery->courier_id,
            'actorId' => $actorUserId,
            'occurredAt' => $occurredAt->toIso8601String(),
            'data' => $payload,
            'channels' => array_values(array_filter([
                "order.{$delivery->order_id}.tracking",
                $delivery->courier_id ? "courier.{$delivery->courier_id}.jobs" : null,
            ])),
        ];

        $delivery->events()->create([
            'event_type' => $eventType->value,
            'payload' => $eventPayload,
            'created_at' => $occurredAt,
        ]);

        app(OutboxService::class)->enqueue('delivery', $delivery->id, $eventType->value, $eventPayload);
        NotificationEventRecorded::dispatch($eventType, $eventPayload);
    }

    private function broadcastJobEvent(DeliveryOfferEventType $eventType, DeliveryOffer $offer): void
    {
        $payload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => $eventType->value,
            'aggregateType' => 'delivery_offer',
            'aggregateId' => $offer->id,
            'offerId' => $offer->id,
            'deliveryId' => $offer->delivery_id,
            'courierId' => $offer->courier_id,
            'expiresAt' => $offer->expires_at?->toIso8601String(),
            'status' => $offer->status->value,
            'occurredAt' => now()->toIso8601String(),
            'channels' => ["courier.{$offer->courier_id}.jobs"],
        ];

        app(OutboxService::class)->enqueue('delivery_offer', $offer->id, $eventType->value, $payload);
        NotificationEventRecorded::dispatch($eventType, $payload);
    }
}
