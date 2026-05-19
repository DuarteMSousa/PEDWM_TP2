<?php

namespace App\GraphQL\Queries;

use App\Services\CategoryService\CategoryServiceInterface;
use App\Services\ProductService\ProductServiceInterface;
use App\Services\RestaurantProductService\RestaurantProductServiceInterface;

class MenuQueries
{
    public function __construct(
        private CategoryServiceInterface $categoryService,
        private ProductServiceInterface $productService,
        private RestaurantProductServiceInterface $restaurantProductService,
    ) {}

    public function getRestaurantMenu($_, array $args): array
    {
        return $this->restaurantProductService->getRestaurantMenu($args['restaurant_id']);
    }

    public function getRestaurantCategoriesByRestaurantId($_, array $args)
    {
        return $this->restaurantProductService->getRestaurantCategoriesByRestaurantId($args['restaurant_id']);
    }

    public function getCategoriesByChainId($_, array $args)
    {
        return $this->categoryService->getCategoriesByChainId($args['chain_id']);
    }

    public function getProductById($_, array $args)
    {
        return $this->productService->getProductById($args['id']);
    }

    public function getRestaurantProductById($_, array $args)
    {
        return $this->restaurantProductService->getRestaurantProductById($args['id']);
    }

    public function getProductOptionGroups($_, array $args)
    {
        return $this->productService->getProductOptionGroups($args['product_id']);
    }
}
