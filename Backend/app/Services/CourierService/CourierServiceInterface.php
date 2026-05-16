<?php

namespace App\Services\CourierService;

use App\Models\Courier;

interface CourierServiceInterface
{
    public function find(string $userId): ?Courier;

    public function setStatus(string $userId, string $status): Courier;

    public function updateLocation(string $courierId, float $latitude, float $longitude): Courier;
}
