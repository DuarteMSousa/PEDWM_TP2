<?php

namespace App\Services\CategoryService;

use App\DTOs\Category\CreateCategoryDTO;
use App\DTOs\Category\UpdateCategoryDTO;
use App\Models\Category;

interface CategoryServiceInterface
{
    public function getCategoriesByChainId(string $chainId);

    public function getCategoryById(string $id): ?Category;

    public function getAllCategories(?string $chainId = null, int $limit = 100);

    public function createCategory(string $actorUserId, CreateCategoryDTO $data): Category;

    public function updateCategory(string $actorUserId, string $id, UpdateCategoryDTO $data): ?Category;

    public function deleteCategory(string $actorUserId, string $id): bool;
}
