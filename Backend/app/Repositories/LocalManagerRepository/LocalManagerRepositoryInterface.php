<?php

namespace App\Repositories\LocalManagerRepository;

use App\DTOs\LocalManager\CreateLocalManagerDTO;

interface LocalManagerRepositoryInterface
{
    public function findByUserId(string $userId);

    public function findByRestaurantId(string $restaurantId);

    public function createLocalManager(CreateLocalManagerDTO $data);

    public function deleteLocalManager(string $userId);
}
