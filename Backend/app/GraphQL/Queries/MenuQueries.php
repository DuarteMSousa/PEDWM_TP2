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
        return $this->restaurantProductService->menu($args['restaurant_id']);
    }

    public function restaurantCategories($_, array $args)
    {
        $menu = $this->restaurantProductService->menu($args['restaurant_id']);

        return $menu['categories'];
    }

    public function chainCategories($_, array $args)
    {
        return $this->categoryService->forChain($args['chain_id']);
    }

    public function product($_, array $args)
    {
        return $this->productService->find($args['id']);
    }

    public function restaurantProduct($_, array $args)
    {
        return $this->restaurantProductService->find($args['id']);
    }

    public function productOptionGroups($_, array $args)
    {
        return $this->productService->getOptionGroups($args['product_id']);
    }
}
