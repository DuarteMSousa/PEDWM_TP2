<?php

namespace App\Services\CourierService;

use App\Aspects\Transactional;
use App\Models\Courier;

class CourierService implements CourierServiceInterface
{
    public function find(string $userId): ?Courier
    {
        return Courier::query()->with('user')->find($userId);
    }

    #[Transactional]
    public function setStatus(string $userId, string $status): Courier
    {
        $courier = Courier::query()->findOrFail($userId);
        $courier->update(['status' => $status]);

        return $courier->refresh()->load('user');
    }

    #[Transactional]
    public function updateLocation(string $courierId, float $latitude, float $longitude): Courier
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
