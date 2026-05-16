<?php

namespace App\Services\CategoryService;

use App\Aspects\Transactional;
use App\DTOs\Category\CreateCategoryDTO;
use App\DTOs\Category\UpdateCategoryDTO;
use App\Models\Category;
use App\Models\RestaurantChain;
use Illuminate\Validation\ValidationException;

class CategoryService implements CategoryServiceInterface
{
    public function forChain(string $chainId)
    {
        return Category::query()
            ->with('products.optionGroups.options')
            ->where('chain_id', $chainId)
            ->orderBy('name')
            ->get();
    }

    public function find(string $id): ?Category
    {
        return Category::query()->with('products.optionGroups.options')->find($id);
    }

    public function all(?string $chainId = null, int $limit = 100)
    {
        $query = Category::query()->with('products.optionGroups.options');

        if ($chainId !== null) {
            $query->where('chain_id', $chainId);
        }

        return $query->orderBy('name')->limit($limit)->get();
    }

    #[Transactional]
    public function create(string $actorUserId, CreateCategoryDTO $data): Category
    {
        $this->validateInput($data->toArray());

        return Category::query()->create([
            'chain_id' => $data->chain_id,
            'name' => $data->name,
        ])->load('products.optionGroups.options');
    }

    #[Transactional]
    public function update(string $actorUserId, string $id, UpdateCategoryDTO $data): ?Category
    {
        $category = Category::query()->find($id);

        if (! $category) {
            return null;
        }

        $input = array_filter($data->toArray(), static fn ($value) => $value !== null);
        $this->validateInput([...$category->toArray(), ...$input], $id);
        $category->update(array_filter([
            'chain_id' => $data->chain_id,
            'name' => $data->name,
        ], static fn ($value) => $value !== null));

        return $category->load('products.optionGroups.options');
    }

    #[Transactional]
    public function delete(string $actorUserId, string $id): bool
    {
        return (bool) Category::query()->whereKey($id)->delete();
    }

    private function validateInput(array $input, ?string $ignoreId = null): void
    {
        $errors = [];

        if (empty($input['name'])) {
            $errors['name'][] = 'Category name is required.';
        }

        if (empty($input['chain_id']) || ! RestaurantChain::query()->whereKey($input['chain_id'])->exists()) {
            $errors['chain_id'][] = 'Restaurant chain does not exist.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
