<?php

namespace App\Repositories\LocalManagerRepository;

use App\DTOs\LocalManager\CreateLocalManagerDTO;
use App\Models\LocalManager;

class LocalManagerRepository implements LocalManagerRepositoryInterface
{
    public function findByUserId(string $userId)
    {
        return LocalManager::where('user_id', $userId)->first();
    }

    public function findByRestaurantId(string $restaurantId)
    {
        return LocalManager::where('restaurant_id', $restaurantId)->get();
    }

    public function createLocalManager(CreateLocalManagerDTO $data)
    {
        return LocalManager::create($data->toArray());
    }

    public function deleteLocalManager(string $userId)
    {
        $localManager = LocalManager::where('user_id', $userId)->first();

        if (!$localManager) {
            return false;
        }

        $localManager->delete();

        return true;
    }
}
