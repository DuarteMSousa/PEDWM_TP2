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
    ) {
    }

    public function restaurantMenu($_, array $args): array
    {
        return $this->restaurantProductService->getRestaurantMenu($args['restaurant_id']);
    }

    public function restaurantCategories($_, array $args)
    {
        $menu = $this->restaurantProductService->getRestaurantMenu($args['restaurant_id']);

        return $menu['categories'];
    }

    public function chainCategories($_, array $args)
    {
        return $this->categoryService->getCategoriesByChainId($args['chain_id']);
    }

    public function product($_, array $args)
    {
        return $this->productService->getProductById($args['id']);
    }

    public function restaurantProduct($_, array $args)
    {
        return $this->restaurantProductService->getRestaurantProductById($args['id']);
    }

    public function productOptionGroups($_, array $args)
    {
        return $this->productService->getProductOptionGroups($args['product_id']);
    }
}
