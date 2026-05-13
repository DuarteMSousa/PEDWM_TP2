<?php

namespace App\Repositories\CategoryRepository;

use App\DTOs\Category\CreateCategoryDTO;
use App\DTOs\Category\UpdateCategoryDTO;
use App\Models\Category;
use App\Models\RestaurantChain;

class CategoryRepository implements CategoryRepositoryInterface
{
    public function findById(string $id)
    {
        return Category::find($id);
    }

    public function findByRestaurantChainId(string $restaurantChainId)
    {
        return Category::where('restaurant_chain_id', $restaurantChainId)->get();
    }

    public function createCategory(CreateCategoryDTO $data)
    {
        return Category::create($data->toArray());
    }

    public function updateCategory(string $id, UpdateCategoryDTO $data)
    {
        $category = Category::find($id);
        if ($category) {
            $category->update($data->toArray());
            return $category;
        }
        return null;
    }


    public function deleteCategory(string $id)
    {
        $category = Category::find($id);
        if ($category) {
            $category->delete();
            return true;
        }
        return false;
    }
}
