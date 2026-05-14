<?php

namespace App\Repositories\RestaurantProductRepository;

use App\DTOs\Product\CreateRestaurantProductDTO;
use App\DTOs\Product\UpdateRestaurantProductDTO;
use App\Models\RestaurantProduct;

class RestaurantProductRepository implements RestaurantProductRepositoryInterface
{
    public function findById(string $id)
    {
        return RestaurantProduct::with(['restaurant', 'product'])->find($id);
    }

    public function findByRestaurantId(string $restaurantId)
    {
        return RestaurantProduct::with(['product.category'])
            ->where('restaurant_id', $restaurantId)
            ->orderBy('created_at')
            ->get();
    }

    public function createRestaurantProduct(CreateRestaurantProductDTO $data)
    {
        return RestaurantProduct::create([
            'restaurant_id' => $data->restaurant_id,
            'product_id' => $data->product_id,
            'local_price' => $data->local_price,
            'is_available' => $data->isAvailable,
            'estimated_preparation_time_min' => $data->estimated_preparation_time_min,
        ]);
    }

    public function updateRestaurantProduct(string $id, UpdateRestaurantProductDTO $data)
    {
        $restaurantProduct = RestaurantProduct::find($id);

        if (!$restaurantProduct) {
            return null;
        }

        $restaurantProduct->update([
            'local_price' => $data->local_price,
            'is_available' => $data->isAvailable,
            'estimated_preparation_time_min' => $data->estimated_preparation_time_min,
        ]);

        return $restaurantProduct;
    }

    public function deleteRestaurantProduct(string $id)
    {
        $restaurantProduct = RestaurantProduct::find($id);

        if (!$restaurantProduct) {
            return false;
        }

        $restaurantProduct->delete();

        return true;
    }
}
