<?php

namespace App\Services\RestaurantService;

use App\DTOs\Restaurant\CreateRestaurantDTO;
use App\DTOs\Restaurant\SearchRestaurantsDTO;
use App\DTOs\Restaurant\UpdateRestaurantDTO;
use App\Models\Restaurant;

interface RestaurantServiceInterface
{
    public function search(SearchRestaurantsDTO $filters);

    public function find(string $id): ?Restaurant;

    public function create(string $actorUserId, CreateRestaurantDTO $data): Restaurant;

    public function update(string $actorUserId, string $id, UpdateRestaurantDTO $data): ?Restaurant;

    public function delete(string $actorUserId, string $id): bool;

    public function forChain(string $chainId);

    public function forLocalManager(string $userId): ?Restaurant;

    public function forOperator(string $userId): ?Restaurant;
}
