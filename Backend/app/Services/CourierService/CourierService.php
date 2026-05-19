<?php

namespace App\Services\CourierService;

use App\Aspects\Transactional;
use App\DTOs\Courier\UpdateCourierDTO;
use App\Enums\CourierStatus;
use App\Models\Courier;
use App\Repositories\CourierRepository\CourierRepositoryInterface;
use Illuminate\Validation\ValidationException;

class CourierService implements CourierServiceInterface
{
    public function __construct(private CourierRepositoryInterface $couriers) {}

    public function getCourierByUserId(string $userId): ?Courier
    {
        return $this->couriers->getByUserIdWithUser($userId);
    }

    public function countAvailableCouriers(): int
    {
        return $this->couriers->countAvailable();
    }

    #[Transactional]
    public function updateCourierStatus(string $userId, string $status): Courier
    {
        $courier = $this->couriers->getByUserIdOrFail($userId);

        if ($status === CourierStatus::OFFLINE->value && $this->courierHasActiveDelivery($userId)) {
            throw ValidationException::withMessages([
                'status' => 'Courier has an active delivery and cannot go offline.',
            ]);
        }

        $this->couriers->updateCourier($userId, new UpdateCourierDTO(status: $status));

        return $courier->refresh()->load('user');
    }

    private function courierHasActiveDelivery(string $courierId): bool
    {
        return $this->couriers->hasActiveDelivery($courierId);
    }

    #[Transactional]
    public function updateCourierLocation(string $courierId, float $latitude, float $longitude): Courier
    {
        $courier = $this->couriers->updateCourier($courierId, new UpdateCourierDTO(
            latitude: $latitude,
            longitude: $longitude,
            lastLocationUpdate: now(),
        ));

        return $courier->refresh()->load('user');
    }
}
