<?php

namespace App\Services\ProductService;

use App\Aspects\Transactional;
use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\UpdateProductDTO;
use App\Models\Category;
use App\Models\Product;
use App\Repositories\ProductRepository\ProductRepositoryInterface;
use Illuminate\Validation\ValidationException;

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

    public function getOptionGroups(string $productId)
    {
        return Product::query()
            ->with('optionGroups.options')
            ->findOrFail($productId)
            ->optionGroups;
    }

    #[Transactional]
    public function createProduct(string $actorUserId, CreateProductDTO $data)
    {
        $this->validateCreate($data);

        return $this->productRepository->createProduct($data);
    }

    #[Transactional]
    public function updateProduct(string $actorUserId, string $id, UpdateProductDTO $data)
    {
        $this->validateUpdate($id, $data);

        return $this->productRepository->updateProduct($id, $data);
    }

    #[Transactional]
    public function deleteProduct(string $actorUserId, string $id)
    {
        return $this->productRepository->deleteProduct($id);
    }

    private function validateCreate(CreateProductDTO $data): void
    {
        $errors = [];

        if (! Category::query()->whereKey($data->category_id)->exists()) {
            $errors['category_id'][] = 'Category does not exist.';
        }

        if ($data->price < 0) {
            $errors['price'][] = 'Product price must be greater than or equal to zero.';
        }

        $this->validateOptionGroups($data->option_groups?->toArray() ?? [], $errors);

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function validateUpdate(string $id, UpdateProductDTO $data): void
    {
        $errors = [];

        if (! Product::query()->whereKey($id)->exists()) {
            $errors['id'][] = 'Product does not exist.';
        }

        if ($data->price !== null && $data->price < 0) {
            $errors['price'][] = 'Product price must be greater than or equal to zero.';
        }

        if ($data->option_groups !== null) {
            $this->validateOptionGroups($data->option_groups->toArray(), $errors);
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function validateOptionGroups(array $groups, array &$errors): void
    {
        foreach ($groups as $groupIndex => $group) {
            $min = (int) ($group['min_options'] ?? 0);
            $max = (int) ($group['max_options'] ?? 0);

            if ($min < 0 || $max < 0) {
                $errors["option_groups.{$groupIndex}"][] = 'Option limits must be greater than or equal to zero.';
            }

            if ($min > $max) {
                $errors["option_groups.{$groupIndex}"][] = 'min_options cannot be greater than max_options.';
            }

            foreach (($group['options'] ?? []) as $optionIndex => $option) {
                if (($option['extra_price'] ?? 0) < 0) {
                    $errors["option_groups.{$groupIndex}.options.{$optionIndex}.extra_price"][] = 'Extra price must be greater than or equal to zero.';
                }
            }
        }
    }
}
