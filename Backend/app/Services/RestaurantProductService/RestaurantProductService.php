<?php

namespace App\Services\RestaurantProductService;

use App\Aspects\Transactional;
use App\DTOs\Product\CreateRestaurantProductDTO;
use App\DTOs\Product\UpdateRestaurantProductDTO;
use App\Models\Category;
use App\Models\Product;
use App\Models\Restaurant;
use App\Models\RestaurantProduct;
use Illuminate\Validation\ValidationException;

class RestaurantProductService implements RestaurantProductServiceInterface
{
    private array $with = ['product.optionGroups.options', 'restaurant'];

    public function getRestaurantProductById(string $id): ?RestaurantProduct
    {
        return RestaurantProduct::query()->with($this->with)->find($id);
    }

    public function getRestaurantProductsByRestaurantId(string $restaurantId)
    {
        return RestaurantProduct::query()
            ->with($this->with)
            ->where('restaurant_id', $restaurantId)
            ->get();
    }

    public function getRestaurantCategoriesByRestaurantId(string $restaurantId)
    {
        return $this->getRestaurantMenu($restaurantId)['categories'];
    }

    public function getRestaurantMenu(string $restaurantId): array
    {
        $restaurant = Restaurant::query()->with(['chain', 'address'])->findOrFail($restaurantId);
        $products = $this->getRestaurantProductsByRestaurantId($restaurantId);
        $categoryIds = $products->pluck('product.category_id')->filter()->unique()->values();
        $categories = Category::query()
            ->with('products.optionGroups.options')
            ->whereIn('id', $categoryIds)
            ->orderBy('name')
            ->get();

        return [
            'restaurant' => $restaurant,
            'categories' => $categories,
            'products' => $products,
        ];
    }

    #[Transactional]
    public function setRestaurantProductAvailability(string $id, bool $isAvailable): ?RestaurantProduct
    {
        return $this->updateRestaurantProduct('', $id, new UpdateRestaurantProductDTO(is_available: $isAvailable));
    }

    #[Transactional]
    public function createRestaurantProduct(string $actorUserId, CreateRestaurantProductDTO $data): RestaurantProduct
    {
        $this->validateInput($data->toArray());

        return RestaurantProduct::query()->create([
            'restaurant_id' => $data->restaurant_id,
            'product_id' => $data->product_id,
            'local_price' => $data->local_price,
            'is_available' => $data->is_available,
            'estimated_preparation_time_min' => $data->estimated_preparation_time_min,
        ])->load($this->with);
    }

    #[Transactional]
    public function updateRestaurantProduct(string $actorUserId, string $id, UpdateRestaurantProductDTO $data): ?RestaurantProduct
    {
        $restaurantProduct = RestaurantProduct::query()->find($id);

        if (! $restaurantProduct) {
            return null;
        }

        $input = array_filter($data->toArray(), static fn ($value) => $value !== null);
        $this->validateInput([...$restaurantProduct->toArray(), ...$input]);
        $restaurantProduct->update(array_filter([
            'restaurant_id' => $data->restaurant_id,
            'product_id' => $data->product_id,
            'local_price' => $data->local_price,
            'is_available' => $data->is_available,
            'estimated_preparation_time_min' => $data->estimated_preparation_time_min,
        ], static fn ($value) => $value !== null));

        return $restaurantProduct->load($this->with);
    }

    private function validateInput(array $input): void
    {
        $errors = [];

        if (empty($input['restaurant_id']) || ! Restaurant::query()->whereKey($input['restaurant_id'])->exists()) {
            $errors['restaurant_id'][] = 'Restaurant does not exist.';
        }

        if (empty($input['product_id']) || ! Product::query()->whereKey($input['product_id'])->exists()) {
            $errors['product_id'][] = 'Product does not exist.';
        }

        if (($input['local_price'] ?? 0) < 0) {
            $errors['local_price'][] = 'Local price must be greater than or equal to zero.';
        }

        if (($input['estimated_preparation_time_min'] ?? 0) < 0) {
            $errors['estimated_preparation_time_min'][] = 'Estimated preparation time must be greater than or equal to zero.';
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }
}
