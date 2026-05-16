<?php

namespace App\Services\TrackingService;

use App\DTOs\Tracking\UpdateCourierLocationDTO;
use App\Models\Courier;
use App\Models\CourierPositionHistory;
use App\Models\Delivery;
use App\Models\Order;
use App\Services\CourierService\CourierServiceInterface;
use App\Services\OutboxService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TrackingService implements TrackingServiceInterface
{
    public function orderTracking(string $userId, string $orderId): array
    {
        $order = Order::query()
            ->with(['delivery.courier', 'delivery.positionHistory'])
            ->where('user_id', $userId)
            ->findOrFail($orderId);
        $delivery = $order->delivery;

        return [
            'order' => $order,
            'delivery' => $delivery,
            'courier' => $delivery?->courier,
            'last_position' => $delivery?->positionHistory()->orderByDesc('timestamp')->first(),
            'eta_seconds' => null,
        ];
    }

    public function deliveryTracking(string $deliveryId): array
    {
        $delivery = Delivery::query()->with(['courier', 'positionHistory'])->findOrFail($deliveryId);

        return [
            'delivery' => $delivery,
            'last_position' => $delivery->positionHistory()->orderByDesc('timestamp')->first(),
            'eta_seconds' => null,
        ];
    }

    public function courierLastPosition(string $courierId): ?CourierPositionHistory
    {
        return CourierPositionHistory::query()
            ->whereHas('delivery', fn ($query) => $query->where('courier_id', $courierId))
            ->orderByDesc('timestamp')
            ->first();
    }

    public function updateCourierLocation(UpdateCourierLocationDTO $data): array
    {
        return DB::transaction(function () use ($data) {
            $delivery = Delivery::query()
                ->where('courier_id', $data->courier_id)
                ->findOrFail($data->delivery_id);

            app(CourierServiceInterface::class)->updateLocation(
                $data->courier_id,
                $data->latitude,
                $data->longitude
            );

            $timestamp = $data->recorded_at ?? now()->toIso8601String();
            CourierPositionHistory::query()->create([
                'delivery_id' => $delivery->id,
                'latitude' => $data->latitude,
                'longitude' => $data->longitude,
                'timestamp' => $timestamp,
            ]);

            app(OutboxService::class)->enqueue('delivery', $delivery->id, 'COURIER_POSITION_UPDATED', [
                'eventId' => (string) Str::uuid(),
                'eventName' => 'COURIER_POSITION_UPDATED',
                'orderId' => $delivery->order_id,
                'deliveryId' => $delivery->id,
                'courierId' => $data->courier_id,
                'lat' => $data->latitude,
                'lng' => $data->longitude,
                'heading' => $data->heading,
                'speed' => $data->speed,
                'accuracy' => $data->accuracy,
                'recordedAt' => $timestamp,
                'etaSeconds' => null,
            ]);

            return [
                'ok' => true,
                'delivery_id' => $delivery->id,
                'recorded_at' => $timestamp,
            ];
        });
    }
}
