<?php

namespace App\Repositories\CourierRepository;

use App\DTOs\Courier\CreateCourierDTO;

interface CourierRepositoryInterface
{
    public function findByUserId(string $userId);

    public function createCourier(CreateCourierDTO $data);

    public function deleteCourier(string $userId);
}
