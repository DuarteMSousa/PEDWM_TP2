<?php

namespace App\Services\ProductService;

use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\UpdateProductDTO;
use App\Repositories\ProductRepository\ProductRepositoryInterface;
use Illuminate\Support\Facades\DB;

class ProductService implements ProductServiceInterface
{
    public function __construct(private ProductRepositoryInterface $productRepository) {}

    public function getById(string $id)
    {
        return $this->productRepository->findById($id);
    }

    public function getByCategoryId(string $categoryId)
    {
        return $this->productRepository->findByCategoryId($categoryId);
    }

    public function createProduct(CreateProductDTO $data)
    {
        return DB::transaction(function () use ($data) {
            return $this->productRepository->createProduct($data);
        });
    }

    public function updateProduct(string $id, UpdateProductDTO $data)
    {
        return DB::transaction(function () use ($id, $data) {
            return $this->productRepository->updateProduct($id, $data);
        });
    }

    public function deleteProduct(string $id)
    {
        return DB::transaction(function () use ($id) {
            return $this->productRepository->deleteProduct($id);
        });
    }
}
