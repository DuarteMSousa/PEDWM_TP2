<?php

namespace App\Services\RestaurantProductService;

use App\DTOs\Product\CreateRestaurantProductDTO;
use App\DTOs\Product\UpdateRestaurantProductDTO;
use App\Models\RestaurantProduct;

interface RestaurantProductServiceInterface
{
    public function find(string $id): ?RestaurantProduct;

    public function forRestaurant(string $restaurantId);

    public function menu(string $restaurantId): array;

    public function setAvailability(string $id, bool $isAvailable): ?RestaurantProduct;

    public function create(string $actorUserId, CreateRestaurantProductDTO $data): RestaurantProduct;

    public function update(string $actorUserId, string $id, UpdateRestaurantProductDTO $data): ?RestaurantProduct;
}
