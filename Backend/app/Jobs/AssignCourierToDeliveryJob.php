<?php

namespace App\Jobs;

use App\Enums\CourierStatus;
use App\Models\Courier;
use App\Models\Delivery;
use App\Services\DeliveryService\DeliveryServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AssignCourierToDeliveryJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $deliveryId)
    {
    }

    public function handle(): void
    {
        $delivery = Delivery::query()
            ->with(['order.restaurant.address', 'offers'])
            ->find($this->deliveryId);

        if (! $delivery || $delivery->courier_id !== null) {
            return;
        }

        $attemptedCourierIds = $delivery->offers->pluck('courier_id')->all();
        $restaurantAddress = $delivery->order?->restaurant?->address;

        $couriers = Courier::query()
            ->where('status', CourierStatus::AVAILABLE->value)
            ->when($attemptedCourierIds !== [], fn ($query) => $query->whereNotIn('user_id', $attemptedCourierIds))
            ->get()
            ->sortBy(function (Courier $courier) use ($restaurantAddress): float {
                if (! $restaurantAddress || $courier->latitude === null || $courier->longitude === null) {
                    return PHP_FLOAT_MAX;
                }

                return $this->distanceKm(
                    (float) $courier->latitude,
                    (float) $courier->longitude,
                    (float) $restaurantAddress->latitude,
                    (float) $restaurantAddress->longitude
                );
            });

        $courier = $couriers->first();

        if (! $courier) {
            return;
        }

        app(DeliveryServiceInterface::class)->offerToCourier($delivery->id, $courier->user_id);
    }

    private function distanceKm(float $fromLat, float $fromLng, float $toLat, float $toLng): float
    {
        $earthRadiusKm = 6371;
        $dLat = deg2rad($toLat - $fromLat);
        $dLng = deg2rad($toLng - $fromLng);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($fromLat)) * cos(deg2rad($toLat)) * sin($dLng / 2) ** 2;

        return $earthRadiusKm * (2 * atan2(sqrt($a), sqrt(1 - $a)));
    }
}
