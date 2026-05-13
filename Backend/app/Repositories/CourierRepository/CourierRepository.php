<?php

namespace App\Repositories\CourierRepository;

use App\DTOs\Courier\CreateCourierDTO;
use App\Models\Courier;

class CourierRepository implements CourierRepositoryInterface
{
    public function findByUserId(string $userId)
    {
        return Courier::where('user_id', $userId)->first();
    }

    public function createCourier(CreateCourierDTO $data)
    {
        return Courier::create($data->toArray());
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
