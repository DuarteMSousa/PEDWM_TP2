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
    ) {
    }

    public function restaurants($_, array $args)
    {
        return $this->restaurantService->search(SearchRestaurantsDTO::from($args['input'] ?? []));
    }

    public function restaurant($_, array $args)
    {
        return $this->restaurantService->find($args['id']);
    }

    public function restaurantChains()
    {
        return $this->restaurantChainService->all(500);
    }

    public function restaurantChain($_, array $args)
    {
        return $this->restaurantChainService->find($args['id']);
    }

    public function chainManagerRestaurants($_, array $args)
    {
        return $this->restaurantService->forChain($args['chain_id']);
    }

    public function localManagerRestaurant($_, array $args)
    {
        return $this->restaurantService->forLocalManager($args['user_id']);
    }

    public function operatorRestaurant($_, array $args)
    {
        return $this->restaurantService->forOperator($args['user_id']);
    }
}
