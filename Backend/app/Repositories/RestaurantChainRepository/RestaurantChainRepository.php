<?php

namespace App\Repositories\RestaurantChainRepository;

use App\DTOs\RestaurantChain\CreateRestaurantChainDTO;
use App\DTOs\RestaurantChain\UpdateRestaurantChainDTO;
use App\Models\RestaurantChain;

class RestaurantChainRepository implements RestaurantChainRepositoryInterface
{
    public function findById(string $id)
    {
        return RestaurantChain::find($id);
    }

    public function createRestaurantChain(CreateRestaurantChainDTO $data)
    {
        return RestaurantChain::create($data->toArray());
    }

    public function updateRestaurantChain(string $id, UpdateRestaurantChainDTO $data)
    {
        $restaurantChain = RestaurantChain::find($id);
        if ($restaurantChain) {
            $restaurantChain->update($data->toArray());
            return $restaurantChain;
        }
        return null;
    }

    public function deleteRestaurantChain(string $id)
    {
        $restaurantChain = RestaurantChain::find($id);
        if ($restaurantChain) {
            $restaurantChain->delete();
            return true;
        }
        return false;
    }
}
