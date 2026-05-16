<?php

namespace App\Services\CategoryService;

use App\DTOs\Category\CreateCategoryDTO;
use App\DTOs\Category\UpdateCategoryDTO;
use App\Models\Category;

interface CategoryServiceInterface
{
    public function forChain(string $chainId);

    public function find(string $id): ?Category;

    public function all(?string $chainId = null, int $limit = 100);

    public function create(string $actorUserId, CreateCategoryDTO $data): Category;

    public function update(string $actorUserId, string $id, UpdateCategoryDTO $data): ?Category;

    public function delete(string $actorUserId, string $id): bool;
}
