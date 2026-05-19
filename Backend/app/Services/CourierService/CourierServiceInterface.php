<?php

namespace App\Services\CourierService;

use App\Models\Courier;

interface CourierServiceInterface
{
    public function getCourierByUserId(string $userId): ?Courier;

    public function updateCourierStatus(string $userId, string $status): Courier;

    public function updateCourierLocation(string $courierId, float $latitude, float $longitude): Courier;

    public function countAvailableCouriers(): int;
}
