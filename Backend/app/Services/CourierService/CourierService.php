<?php

namespace App\Services\CourierService;

use App\Aspects\Transactional;
use App\Models\Courier;

class CourierService implements CourierServiceInterface
{
    public function getCourierByUserId(string $userId): ?Courier
    {
        return Courier::query()->with('user')->find($userId);
    }

    #[Transactional]
    public function updateCourierStatus(string $userId, string $status): Courier
    {
        $courier = Courier::query()->findOrFail($userId);
        $courier->update(['status' => $status]);

        return $courier->refresh()->load('user');
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
