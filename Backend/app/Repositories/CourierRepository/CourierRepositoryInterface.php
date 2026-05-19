<?php

namespace App\Repositories\CourierRepository;

use App\DTOs\Courier\CreateCourierDTO;
use App\DTOs\Courier\UpdateCourierDTO;

interface CourierRepositoryInterface
{
    public function findByUserId(string $userId);

    public function getByUserIdWithUser(string $userId);

    public function getByUserIdOrFail(string $userId);

    public function countAvailable(): int;

    public function getAvailableExceptUserIds(array $excludedUserIds);

    public function hasActiveDelivery(string $userId): bool;

    public function createCourier(CreateCourierDTO $data);

    public function updateCourier(string $userId, UpdateCourierDTO $data);

    public function deleteCourier(string $userId);
}
