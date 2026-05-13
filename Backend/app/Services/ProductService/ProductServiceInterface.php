<?php

namespace App\Services\ProductService;

use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\UpdateProductDTO;

interface ProductServiceInterface
{
    public function getById(string $id);

    public function getByCategoryId(string $categoryId);

    public function createProduct(CreateProductDTO $data);

    public function updateProduct(string $id, UpdateProductDTO $data);

    public function deleteProduct(string $id);
}
