<?php

namespace App\Jobs;

use App\Domain\Geo\GeoMath;
use App\Enums\CourierStatus;
use App\Models\Courier;
use App\Models\Delivery;
use App\Services\DeliveryService\DeliveryServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AssignCourierToDeliveryJob implements ShouldQueue
{
    use Queueable;

    private const MAX_ASSIGNMENT_ATTEMPTS = 3;

    public function __construct(public string $deliveryId) {}

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

        if (count($attemptedCourierIds) >= self::MAX_ASSIGNMENT_ATTEMPTS) {
            $this->failDeliveryWithoutCourier($delivery);

            return;
        }

        $couriers = Courier::query()
            ->where('status', CourierStatus::AVAILABLE->value)
            ->when($attemptedCourierIds !== [], fn ($query) => $query->whereNotIn('user_id', $attemptedCourierIds))
            ->get()
            ->sortBy(function (Courier $courier) use ($restaurantAddress): float {
                if (! $restaurantAddress || $courier->latitude === null || $courier->longitude === null) {
                    return PHP_FLOAT_MAX;
                }

                return GeoMath::distanceKm(
                    (float) $courier->latitude,
                    (float) $courier->longitude,
                    (float) $restaurantAddress->latitude,
                    (float) $restaurantAddress->longitude
                );
            });

        $courier = $couriers->first();

        if (! $courier) {
            $this->failDeliveryWithoutCourier($delivery);

            return;
        }

        app(DeliveryServiceInterface::class)->createDeliveryOfferForCourier($delivery->id, $courier->user_id);
    }

    private function failDeliveryWithoutCourier(Delivery $delivery): void
    {
        app(DeliveryServiceInterface::class)->markDeliveryFailedBySystem(
            $delivery->id,
            'NO_COURIER_AVAILABLE'
        );
    }
}
