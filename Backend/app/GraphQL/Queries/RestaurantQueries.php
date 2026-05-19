<?php

namespace App\GraphQL\Queries;

use App\DTOs\Restaurant\SearchRestaurantsDTO;
use App\Services\RestaurantChainService\RestaurantChainServiceInterface;
use App\Services\RestaurantService\RestaurantServiceInterface;

class RestaurantQueries
{
    public function __construct(
        private RestaurantServiceInterface $restaurantService,
        private RestaurantChainServiceInterface $restaurantChainService,
    ) {}

    public function searchRestaurants($_, array $args)
    {
        return $this->restaurantService->searchRestaurants(
            SearchRestaurantsDTO::from($args['input'] ?? []),
        );
    }

    public function getRestaurantById($_, array $args)
    {
        return $this->restaurantService->getRestaurantById($args['id']);
    }

    public function getAllRestaurantChains()
    {
        return $this->restaurantChainService->getAllRestaurantChains(500);
    }

    public function getRestaurantChainById($_, array $args)
    {
        return $this->restaurantChainService->getRestaurantChainById($args['id']);
    }

    public function getRestaurantsByChainId($_, array $args)
    {
        return $this->restaurantService->getRestaurantsByChainId($args['chain_id']);
    }

    public function getRestaurantByLocalManagerUserId($_, array $args)
    {
        return $this->restaurantService->getRestaurantByLocalManagerUserId($args['user_id']);
    }
}
