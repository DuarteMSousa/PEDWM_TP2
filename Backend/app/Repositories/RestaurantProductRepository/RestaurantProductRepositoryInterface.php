<?php

namespace App\Repositories\RestaurantProductRepository;

use App\DTOs\Product\CreateRestaurantProductDTO;
use App\DTOs\Product\UpdateRestaurantProductDTO;

interface RestaurantProductRepositoryInterface
{
    public function findById(string $id);

    public function findByRestaurantId(string $restaurantId);

    public function createRestaurantProduct(CreateRestaurantProductDTO $data);

    public function updateRestaurantProduct(string $id, UpdateRestaurantProductDTO $data);

    public function deleteRestaurantProduct(string $id);
}
