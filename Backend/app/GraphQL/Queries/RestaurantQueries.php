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
        // Normaliza payloads em que o cliente envia null para campos opcionais
        // (caso comum em GraphQL): preserva os defaults declarados no DTO.
        $rawInput = $args['input'] ?? [];
        $sanitizedInput = array_filter(
            $rawInput,
            static fn ($value) => $value !== null,
        );

        return $this->restaurantService->searchRestaurants(
            SearchRestaurantsDTO::from($sanitizedInput),
        );
    }

    public function restaurant($_, array $args)
    {
        return $this->restaurantService->getRestaurantById($args['id']);
    }

    public function restaurantChains()
    {
        return $this->restaurantChainService->getAllRestaurantChains(500);
    }

    public function restaurantChain($_, array $args)
    {
        return $this->restaurantChainService->getRestaurantChainById($args['id']);
    }

    public function chainManagerRestaurants($_, array $args)
    {
        return $this->restaurantService->getRestaurantsByChainId($args['chain_id']);
    }

    public function localManagerRestaurant($_, array $args)
    {
        return $this->restaurantService->getRestaurantByLocalManagerUserId($args['user_id']);
    }

    public function operatorRestaurant($_, array $args)
    {
        return $this->restaurantService->getRestaurantByOperatorUserId($args['user_id']);
    }
}
