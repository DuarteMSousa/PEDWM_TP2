<?php

namespace App\Repositories\ProductRepository;

use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\UpdateProductDTO;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class ProductRepository implements ProductRepositoryInterface
{
    public function findById(string $id)
    {
        return Product::with(['optionGroups.options'])->find($id);
    }

    public function findByCategoryId(string $categoryId)
    {
        return Product::with(['optionGroups.options'])
            ->where('category_id', $categoryId)
            ->get();
    }

    public function createProduct(CreateProductDTO $data)
    {
        $product = Product::create($data->toArray());

        foreach ($data->option_groups as $groupDTO) {
            $group = $product->optionGroups()->create($groupDTO->toArray());

            foreach ($groupDTO->options as $optionDTO) {
                $group->options()->create($optionDTO->toArray());
            }
        }

        return $product->load('optionGroups.options');
    }

    public function updateProduct(string $id, UpdateProductDTO $data)
    {
        $product = Product::with(['optionGroups.options'])->find($id);

        if (!$product) {
            return null;
        }

        DB::transaction(function () use ($product, $data): void {
            $product->update($data->toArray());

            if ($data->option_groups === null) {
                return;
            }

            $keptGroupIds = [];

            foreach ($data->option_groups as $groupDTO) {
                $group = null;
                if ($groupDTO->id !== null) {
                    $group = $product->optionGroups()->where('id', $groupDTO->id)->first();
                }

                if ($group) {
                    $group->update($groupDTO->toArray());
                } else {
                    $group = $product->optionGroups()->create($groupDTO->toArray());
                }

                $keptGroupIds[] = $group->id;

                $keptOptionIds = [];
                foreach ($groupDTO->options as $optionDTO) {
                    $option = null;
                    if ($optionDTO->id !== null) {
                        $option = $group->options()->where('id', $optionDTO->id)->first();
                    }

                    if ($option) {
                        $option->update($optionDTO->toArray());
                    } else {
                        $option = $group->options()->create($optionDTO->toArray());
                    }

                    $keptOptionIds[] = $option->id;
                }

                if (count($keptOptionIds) === 0) {
                    $group->options()->delete();
                } else {
                    $group->options()->whereNotIn('id', $keptOptionIds)->delete();
                }
            }

            $groupsToDelete = $product->optionGroups()->whereNotIn('id', $keptGroupIds)->get();
            $groupsToDelete->each(function ($group): void {
                $group->options()->delete();
                $group->delete();
            });
        });

        return $product->load('optionGroups.options');
    }

    public function deleteProduct(string $id)
    {
        $product = Product::find($id);

        if (!$product) {
            return false;
        }

        $product->optionGroups()->each(function ($group) {
            $group->options()->delete();
            $group->delete();
        });

        $product->delete();

        return true;
    }
}
