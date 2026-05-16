<?php

namespace App\Services\ProductService;

use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\UpdateProductDTO;

interface ProductServiceInterface
{
    public function getById(string $id);

    public function getByCategoryId(string $categoryId);

    public function getOptionGroups(string $productId);

    public function createProduct(string $actorUserId, CreateProductDTO $data);

    public function updateProduct(string $actorUserId, string $id, UpdateProductDTO $data);

    public function deleteProduct(string $actorUserId, string $id);
}
