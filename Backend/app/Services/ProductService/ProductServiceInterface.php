<?php

namespace App\Services\ProductService;

use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\UpdateProductDTO;

interface ProductServiceInterface
{
    public function getProductById(string $id);

    public function getProductsByCategoryId(string $categoryId);

    public function getProductOptionGroups(string $productId);

    public function createProduct(string $actorUserId, CreateProductDTO $data);

    public function updateProduct(string $actorUserId, string $id, UpdateProductDTO $data);

    public function deleteProduct(string $actorUserId, string $id);
}
