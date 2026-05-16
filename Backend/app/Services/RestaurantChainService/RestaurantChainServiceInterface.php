<?php

namespace App\Services\RestaurantChainService;

use App\DTOs\RestaurantChain\CreateRestaurantChainDTO;
use App\DTOs\RestaurantChain\UpdateRestaurantChainDTO;
use App\Models\RestaurantChain;

interface RestaurantChainServiceInterface
{
    public function find(string $id): ?RestaurantChain;

    public function all(int $limit = 100);

    public function create(string $actorUserId, CreateRestaurantChainDTO $data): RestaurantChain;

    public function update(string $actorUserId, string $id, UpdateRestaurantChainDTO $data): ?RestaurantChain;

    public function delete(string $actorUserId, string $id): bool;
}
