<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Category\CreateCategoryDTO;
use App\DTOs\Category\UpdateCategoryDTO;
use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\CreateRestaurantProductDTO;
use App\DTOs\Product\UpdateProductDTO;
use App\DTOs\Product\UpdateRestaurantProductDTO;
use App\Services\CategoryService\CategoryServiceInterface;
use App\Services\ProductService\ProductServiceInterface;
use App\Services\RestaurantProductService\RestaurantProductServiceInterface;

class MenuMutations
{
    public function __construct(
        private CategoryServiceInterface $categoryService,
        private ProductServiceInterface $productService,
        private RestaurantProductServiceInterface $restaurantProductService,
    ) {
    }

    public function createCategory($_, array $args) { return $this->categoryService->createCategory($args['actor_user_id'] ?? 'system', CreateCategoryDTO::from($args['input'])); }
    public function updateCategory($_, array $args) { return $this->categoryService->updateCategory($args['actor_user_id'] ?? 'system', $args['id'], UpdateCategoryDTO::from($args['input'])); }
    public function deleteCategory($_, array $args): bool { return $this->categoryService->deleteCategory($args['actor_user_id'] ?? 'system', $args['id']); }

    public function createProduct($_, array $args) { return $this->productService->createProduct($args['actor_user_id'], CreateProductDTO::from($args['input'])); }
    public function updateProduct($_, array $args) { return $this->productService->updateProduct($args['actor_user_id'], $args['id'], UpdateProductDTO::from($args['input'])); }
    public function deleteProduct($_, array $args): bool { return $this->productService->deleteProduct($args['actor_user_id'], $args['id']); }

    public function createRestaurantProduct($_, array $args) { return $this->restaurantProductService->createRestaurantProduct($args['actor_user_id'] ?? 'system', CreateRestaurantProductDTO::from($args['input'])); }
    public function updateRestaurantProduct($_, array $args) { return $this->restaurantProductService->updateRestaurantProduct($args['actor_user_id'] ?? 'system', $args['id'], UpdateRestaurantProductDTO::from($args['input'])); }
    public function setRestaurantProductAvailability($_, array $args) { return $this->restaurantProductService->setRestaurantProductAvailability($args['id'], $args['is_available']); }
}
