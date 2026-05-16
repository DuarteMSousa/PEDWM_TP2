<?php

namespace App\Services\DeliveryService;

use App\Enums\CourierStatus;
use App\Enums\DeliveryStatus;
use App\Models\Delivery;
use App\Services\CourierService\CourierServiceInterface;
use App\Services\OrderService\OrderServiceInterface;
use Illuminate\Support\Facades\DB;

class DeliveryService implements DeliveryServiceInterface
{
    private array $with = ['order', 'courier.user', 'positionHistory'];

    public function find(string $id): ?Delivery
    {
        return Delivery::query()->with($this->with)->find($id);
    }

    public function forOrder(string $orderId): ?Delivery
    {
        return Delivery::query()->with($this->with)->where('order_id', $orderId)->first();
    }

    public function activeForCourier(string $courierId): ?Delivery
    {
        return Delivery::query()
            ->with($this->with)
            ->where('courier_id', $courierId)
            ->whereNotIn('status', [DeliveryStatus::DELIVERED->value, DeliveryStatus::FAILED->value])
            ->first();
    }

    public function forCourier(string $courierId, ?array $statuses = null)
    {
        $query = Delivery::query()->with($this->with)->where('courier_id', $courierId);

        if ($statuses) {
            $query->whereIn('status', $statuses);
        }

        return $query->orderByDesc('created_at')->get();
    }

    public function offersForCourier(string $courierId)
    {
        return Delivery::query()
            ->with($this->with)
            ->where('courier_id', $courierId)
            ->where('status', DeliveryStatus::PENDING->value)
            ->get();
    }

    public function createForOrder(string $orderId, float $deliveryFee): Delivery
    {
        return Delivery::query()->firstOrCreate(
            ['order_id' => $orderId],
            ['status' => DeliveryStatus::PENDING->value, 'delivery_fee' => $deliveryFee]
        )->load($this->with);
    }

    public function offerToCourier(string $deliveryId, string $courierId): Delivery
    {
        $delivery = Delivery::query()->findOrFail($deliveryId);
        $delivery->update(['courier_id' => $courierId]);

        return $delivery->refresh()->load($this->with);
    }

    public function acceptOffer(string $deliveryId, string $courierId): Delivery
    {
        return DB::transaction(function () use ($deliveryId, $courierId) {
            $delivery = Delivery::query()->with('order')->findOrFail($deliveryId);
            $delivery->update(['courier_id' => $courierId]);
            app(CourierServiceInterface::class)->setStatus($courierId, CourierStatus::BUSY->value);

            return $delivery->refresh()->load($this->with);
        });
    }

    public function rejectOffer(string $deliveryId, string $courierId): bool
    {
        return (bool) Delivery::query()
            ->whereKey($deliveryId)
            ->where('courier_id', $courierId)
            ->update(['courier_id' => null]);
    }

    public function markPickedUp(string $deliveryId, string $courierId): Delivery
    {
        return $this->setStatus($deliveryId, $courierId, DeliveryStatus::PICKED_UP, ['pickup_time' => now()]);
    }

    public function markInTransit(string $deliveryId, string $courierId): Delivery
    {
        return DB::transaction(function () use ($deliveryId, $courierId) {
            $delivery = $this->setStatus($deliveryId, $courierId, DeliveryStatus::IN_TRANSIT);
            app(OrderServiceInterface::class)->markOutForDelivery($delivery->order, $courierId);

            return $delivery->refresh()->load($this->with);
        });
    }

    public function markDelivered(string $deliveryId, string $courierId): Delivery
    {
        return DB::transaction(function () use ($deliveryId, $courierId) {
            $delivery = $this->setStatus($deliveryId, $courierId, DeliveryStatus::DELIVERED, ['delivery_time' => now()]);
            app(OrderServiceInterface::class)->markDelivered($delivery->order, $courierId);
            app(CourierServiceInterface::class)->setStatus($courierId, CourierStatus::AVAILABLE->value);

            return $delivery->refresh()->load($this->with);
        });
    }

    public function markFailed(string $deliveryId, string $courierId, string $reason): Delivery
    {
        return $this->setStatus($deliveryId, $courierId, DeliveryStatus::FAILED, ['failure_reason' => $reason]);
    }

    private function setStatus(string $deliveryId, string $courierId, DeliveryStatus $status, array $extra = []): Delivery
    {
        $delivery = Delivery::query()
            ->where('courier_id', $courierId)
            ->findOrFail($deliveryId);
        $delivery->fill([
            'status' => $status->value,
            ...$extra,
        ]);
        $delivery->save();

        return $delivery->refresh()->load($this->with);
    }
}
