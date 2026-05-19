<?php

namespace App\Services\CourierService;

use App\Aspects\Transactional;
use App\Enums\CourierStatus;
use App\Enums\DeliveryStatus;
use App\Models\Courier;
use App\Models\Delivery;
use Illuminate\Validation\ValidationException;

class CourierService implements CourierServiceInterface
{
    public function getCourierByUserId(string $userId): ?Courier
    {
        return Courier::query()->with('user')->find($userId);
    }

    public function countAvailableCouriers(): int
    {
        return Courier::query()
            ->where('status', CourierStatus::AVAILABLE->value)
            ->count();
    }

    #[Transactional]
    public function updateCourierStatus(string $userId, string $status): Courier
    {
        $courier = Courier::query()->findOrFail($userId);

        if ($status === CourierStatus::OFFLINE->value && $this->courierHasActiveDelivery($userId)) {
            throw ValidationException::withMessages([
                'status' => 'Courier has an active delivery and cannot go offline.',
            ]);
        }

        $courier->update(['status' => $status]);

        return $courier->refresh()->load('user');
    }

    private function courierHasActiveDelivery(string $courierId): bool
    {
        return Delivery::query()
            ->where('courier_id', $courierId)
            ->whereNotIn('status', [DeliveryStatus::DELIVERED->value, DeliveryStatus::FAILED->value])
            ->exists();
    }

    #[Transactional]
    public function updateCourierLocation(string $courierId, float $latitude, float $longitude): Courier
    {
        $courier = Courier::query()->findOrFail($courierId);
        $courier->update([
            'latitude' => $latitude,
            'longitude' => $longitude,
            'last_location_update' => now(),
        ]);

        return $courier->refresh()->load('user');
    }
}
