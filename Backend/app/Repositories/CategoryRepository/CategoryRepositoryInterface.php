<?php

namespace App\Repositories\CategoryRepository;

use App\DTOs\Category\CreateCategoryDTO;
use App\DTOs\Category\UpdateCategoryDTO;

interface CategoryRepositoryInterface
{
    public function findById(string $id);

    public function findByRestaurantChainId(string $restaurantChainId);

    public function createCategory(CreateCategoryDTO $data);

    public function updateCategory(string $id, UpdateCategoryDTO $data);

    public function deleteCategory(string $id);
}


