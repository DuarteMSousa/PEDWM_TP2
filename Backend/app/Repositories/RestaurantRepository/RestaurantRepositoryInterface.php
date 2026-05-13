<?php

namespace App\Repositories\RestaurantRepository;

use App\DTOs\Restaurant\SearchRestaurantsDTO;
use App\DTOs\Restaurant\CreateRestaurantDTO;
use App\DTOs\Restaurant\UpdateRestaurantDTO;

interface RestaurantRepositoryInterface
{
    public function findById(string $id);

    public function searchRestaurants(SearchRestaurantsDTO $filters);

    public function createRestaurant(CreateRestaurantDTO $data);

    public function updateRestaurant(string $id, UpdateRestaurantDTO $data);

    public function deleteRestaurant(string $id);
}


