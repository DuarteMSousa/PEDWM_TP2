<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Restaurant\CreateRestaurantDTO;
use App\DTOs\Restaurant\UpdateRestaurantDTO;
use App\DTOs\RestaurantChain\CreateRestaurantChainDTO;
use App\DTOs\RestaurantChain\UpdateRestaurantChainDTO;
use App\Services\RestaurantChainService\RestaurantChainServiceInterface;
use App\Services\RestaurantService\RestaurantServiceInterface;

class RestaurantMutations
{
    public function __construct(
        private RestaurantServiceInterface $restaurantService,
        private RestaurantChainServiceInterface $restaurantChainService,
    ) {
    }

    public function createRestaurantChain($_, array $args)
    {
        return $this->restaurantChainService->createRestaurantChain($args['actor_user_id'] ?? 'system', CreateRestaurantChainDTO::from($args['input']));
    }

    public function updateRestaurantChain($_, array $args)
    {
        return $this->restaurantChainService->updateRestaurantChain($args['actor_user_id'] ?? 'system', $args['id'], UpdateRestaurantChainDTO::from($args['input']));
    }

    public function deleteRestaurantChain($_, array $args): bool
    {
        return $this->restaurantChainService->deleteRestaurantChain($args['actor_user_id'] ?? 'system', $args['id']);
    }

    public function createRestaurant($_, array $args)
    {
        return $this->restaurantService->createRestaurant($args['actor_user_id'] ?? 'system', CreateRestaurantDTO::from($args['input']));
    }

    public function updateRestaurant($_, array $args)
    {
        return $this->restaurantService->updateRestaurant($args['actor_user_id'] ?? 'system', $args['id'], UpdateRestaurantDTO::from($args['input']));
    }

    public function deleteRestaurant($_, array $args): bool
    {
        return $this->restaurantService->deleteRestaurant($args['actor_user_id'] ?? 'system', $args['id']);
    }
}
