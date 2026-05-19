<?php

namespace App\Repositories\CourierRepository;

use App\DTOs\Courier\CreateCourierDTO;
use App\DTOs\Courier\UpdateCourierDTO;
use App\Enums\CourierStatus;
use App\Enums\DeliveryStatus;
use App\Models\Courier;
use App\Models\Delivery;

class CourierRepository implements CourierRepositoryInterface
{
    public function findByUserId(string $userId)
    {
        return Courier::where('user_id', $userId)->first();
    }

    public function getByUserIdWithUser(string $userId)
    {
        return Courier::query()->with('user')->find($userId);
    }

    public function getByUserIdOrFail(string $userId)
    {
        return Courier::query()->findOrFail($userId);
    }

    public function countAvailable(): int
    {
        return Courier::query()
            ->where('status', CourierStatus::AVAILABLE->value)
            ->count();
    }

    public function getAvailableExceptUserIds(array $excludedUserIds)
    {
        return Courier::query()
            ->where('status', CourierStatus::AVAILABLE->value)
            ->when($excludedUserIds !== [], fn ($query) => $query->whereNotIn('user_id', $excludedUserIds))
            ->get();
    }

    public function hasActiveDelivery(string $userId): bool
    {
        return Delivery::query()
            ->where('courier_id', $userId)
            ->whereNotIn('status', [DeliveryStatus::DELIVERED->value, DeliveryStatus::FAILED->value])
            ->exists();
    }

    public function createCourier(CreateCourierDTO $data)
    {
        return Courier::create($data->toArray());
    }

    public function updateCourier(string $userId, UpdateCourierDTO $data)
    {
        $courier = $this->getByUserIdOrFail($userId);
        $courier->update(array_filter([
            'status' => $data->status,
            'latitude' => $data->latitude,
            'longitude' => $data->longitude,
            'last_location_update' => $data->lastLocationUpdate,
        ], static fn ($value) => $value !== null));

        return $courier;
    }

    public function deleteCourier(string $userId)
    {
        $courier = Courier::where('user_id', $userId)->first();

        if (!$courier) {
            return false;
        }

        $courier->delete();

        return true;
    }
}
