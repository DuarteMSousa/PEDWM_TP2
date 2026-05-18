<?php

namespace App\Services\RestaurantProductService;

use App\DTOs\Product\CreateRestaurantProductDTO;
use App\DTOs\Product\UpdateRestaurantProductDTO;
use App\Models\RestaurantProduct;

interface RestaurantProductServiceInterface
{
    public function getRestaurantProductById(string $id): ?RestaurantProduct;

    public function getRestaurantProductsByRestaurantId(string $restaurantId);

    public function getRestaurantMenu(string $restaurantId): array;

    public function setRestaurantProductAvailability(string $id, bool $isAvailable): ?RestaurantProduct;

    public function createRestaurantProduct(string $actorUserId, CreateRestaurantProductDTO $data): RestaurantProduct;

    public function updateRestaurantProduct(string $actorUserId, string $id, UpdateRestaurantProductDTO $data): ?RestaurantProduct;
}
