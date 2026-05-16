<?php

namespace App\Repositories\ProductRepository;

use App\DTOs\Product\CreateProductDTO;
use App\DTOs\Product\UpdateProductDTO;
use App\Models\Product;

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
        $product = Product::create([
            'category_id' => $data->category_id,
            'name' => $data->name,
            'price' => $data->price,
            'description' => $data->description,
        ]);

        foreach ($data->option_groups ?? [] as $groupDTO) {
            $group = $product->optionGroups()->create([
                'name' => $groupDTO->name,
                'min_options' => $groupDTO->min_options,
                'max_options' => $groupDTO->max_options,
            ]);

            foreach ($groupDTO->options as $optionDTO) {
                $group->options()->create([
                    'name' => $optionDTO->name,
                    'extra_price' => $optionDTO->extra_price,
                    'default_option' => $optionDTO->default_option,
                ]);
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

        $product->update(array_filter([
            'name' => $data->name,
            'price' => $data->price,
            'description' => $data->description,
        ], static fn ($value) => $value !== null));

        if ($data->option_groups === null) {
            return $product->load('optionGroups.options');
        }

        $existingGroupsById = $product->optionGroups->keyBy('id');
        $keptGroupIds = [];

        foreach ($data->option_groups as $groupDTO) {
            $group = $groupDTO->id !== null ? $existingGroupsById->get($groupDTO->id) : null;

            if ($group) {
                $group->update([
                    'name' => $groupDTO->name,
                    'min_options' => $groupDTO->min_options,
                    'max_options' => $groupDTO->max_options,
                ]);
            } else {
                $group = $product->optionGroups()->create([
                    'name' => $groupDTO->name,
                    'min_options' => $groupDTO->min_options,
                    'max_options' => $groupDTO->max_options,
                ]);
            }

            $keptGroupIds[] = $group->id;
            $existingOptionsById = $group->relationLoaded('options') ? $group->options->keyBy('id') : collect();
            $keptOptionIds = [];

            foreach ($groupDTO->options as $optionDTO) {
                $option = $optionDTO->id !== null ? $existingOptionsById->get($optionDTO->id) : null;

                if ($option) {
                    $option->update([
                        'name' => $optionDTO->name,
                        'extra_price' => $optionDTO->extra_price,
                        'default_option' => $optionDTO->default_option,
                    ]);
                } else {
                    $option = $group->options()->create([
                        'name' => $optionDTO->name,
                        'extra_price' => $optionDTO->extra_price,
                        'default_option' => $optionDTO->default_option,
                    ]);
                }

                $keptOptionIds[] = $option->id;
            }

            if (count($keptOptionIds) === 0) {
                $group->options()->delete();
            } else {
                $group->options()->whereNotIn('id', $keptOptionIds)->delete();
            }
        }

        if (count($keptGroupIds) === 0) {
            $product->optionGroups()->delete();
        } else {
            $product->optionGroups()->whereNotIn('id', $keptGroupIds)->delete();
        }

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
