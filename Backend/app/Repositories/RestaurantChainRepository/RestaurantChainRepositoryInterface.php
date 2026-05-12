<?php

namespace App\Repositories\RestaurantChainRepository;


interface RestaurantChainRepositoryInterface
{
    public function findById(string $id);

    public function createRestaurantChain(CreateRestaurantChainDTO $data);

    public function updateRestaurantChain(string $id, UpdateRestaurantChainDTO $data);

    public function deleteRestaurantChain(string $id);
}


