<?php

namespace App\GraphQL\Mutations;

use App\Enums\UserType;
use App\Models\Category;
use App\Models\Product;
use App\Models\Restaurant;
use App\Models\RestaurantProduct;
use App\Models\User;
use GraphQL\Error\UserError;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;

class RestaurantMenuMutations
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function create(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];

        $restaurant = $this->resolveManagedRestaurant($user, $input['restaurant_id'] ?? null);

        if (! $restaurant) {
            throw new UserError('Restaurant not found or not managed by this user.');
        }

        $price = (float) $input['price'];
        if ($price < 0) {
            throw new UserError('Price must be a positive number.');
        }

        $created = DB::transaction(function () use ($restaurant, $input, $price): array {
            $categoryName = trim((string) $input['category']);
            $productName = trim((string) $input['name']);

            if ($categoryName === '' || $productName === '') {
                throw new UserError('Category and name are required.');
            }

            /** @var Category $category */
            $category = Category::query()->firstOrCreate(
                [
                    'chain_id' => $restaurant->chain_id,
                    'name' => $categoryName,
                ]
            );

            /** @var Product $product */
            $product = Product::query()->create([
                'category_id' => $category->id,
                'name' => $productName,
                'description' => trim((string) ($input['description'] ?? '')) ?: null,
                'price' => $price,
            ]);

            /** @var RestaurantProduct $restaurantProduct */
            $restaurantProduct = RestaurantProduct::query()->create([
                'restaurant_id' => $restaurant->id,
                'product_id' => $product->id,
                'local_price' => $price,
                'estimated_preparation_time_min' => $input['estimated_preparation_time_min'] ?? null,
                'is_available' => (bool) ($input['is_available'] ?? true),
            ]);

            return [
                'product' => $product,
                'restaurant_product' => $restaurantProduct,
            ];
        });

        /** @var Product $product */
        $product = $created['product'];
        /** @var RestaurantProduct $restaurantProduct */
        $restaurantProduct = $created['restaurant_product'];

        return [
            'ok' => true,
            'restaurant_product_id' => $restaurantProduct->id,
            'product_id' => $product->id,
            'restaurant_id' => $restaurant->id,
            'message' => 'Menu product created.',
        ];
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function update(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];

        /** @var RestaurantProduct|null $restaurantProduct */
        $restaurantProduct = RestaurantProduct::query()
            ->with(['restaurant', 'product'])
            ->whereKey($input['restaurant_product_id'])
            ->first();

        if (! $restaurantProduct) {
            throw new UserError('Restaurant product not found.');
        }

        if (! $this->canManageRestaurant($user, $restaurantProduct->restaurant_id)) {
            throw new UserError('Not authorized to update this menu product.');
        }

        $updateData = [];

        if (array_key_exists('price', $input) && $input['price'] !== null) {
            $price = (float) $input['price'];
            if ($price < 0) {
                throw new UserError('Price must be a positive number.');
            }

            $updateData['local_price'] = $price;
        }

        if (array_key_exists('estimated_preparation_time_min', $input)) {
            $updateData['estimated_preparation_time_min'] = $input['estimated_preparation_time_min'];
        }

        if (array_key_exists('is_available', $input) && $input['is_available'] !== null) {
            $updateData['is_available'] = (bool) $input['is_available'];
        }

        if (! empty($updateData)) {
            $restaurantProduct->update($updateData);
        }

        return [
            'ok' => true,
            'restaurant_product_id' => $restaurantProduct->id,
            'product_id' => $restaurantProduct->product_id,
            'restaurant_id' => $restaurantProduct->restaurant_id,
            'message' => 'Menu product updated.',
        ];
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<string, mixed>
     */
    public function delete(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $input = $args['input'];

        /** @var RestaurantProduct|null $restaurantProduct */
        $restaurantProduct = RestaurantProduct::query()
            ->withCount(['orderItems', 'cartItems'])
            ->whereKey($input['restaurant_product_id'])
            ->first();

        if (! $restaurantProduct) {
            throw new UserError('Restaurant product not found.');
        }

        if (! $this->canManageRestaurant($user, $restaurantProduct->restaurant_id)) {
            throw new UserError('Not authorized to delete this menu product.');
        }

        $message = 'Menu product deleted.';

        if ($restaurantProduct->order_items_count > 0 || $restaurantProduct->cart_items_count > 0) {
            $restaurantProduct->update(['is_available' => false]);
            $message = 'Menu product had references and was deactivated instead.';
        } else {
            $restaurantProduct->delete();
        }

        return [
            'ok' => true,
            'restaurant_product_id' => $restaurantProduct->id,
            'product_id' => $restaurantProduct->product_id,
            'restaurant_id' => $restaurantProduct->restaurant_id,
            'message' => $message,
        ];
    }

    private function resolveManagedRestaurant(User $user, ?string $requestedRestaurantId): ?Restaurant
    {
        $restaurantIds = $this->resolveManagedRestaurantIds($user);

        if (empty($restaurantIds)) {
            return null;
        }

        if ($requestedRestaurantId) {
            if (! in_array($requestedRestaurantId, $restaurantIds, true)) {
                return null;
            }

            return Restaurant::query()->whereKey($requestedRestaurantId)->first();
        }

        return Restaurant::query()->whereKey($restaurantIds[0])->first();
    }

    /**
     * @return array<int, string>
     */
    private function resolveManagedRestaurantIds(User $user): array
    {
        if ($user->user_type === UserType::LOCAL_MANAGER) {
            $restaurantId = $user->localManager?->restaurant_id;
            return $restaurantId ? [$restaurantId] : [];
        }

        if ($user->user_type === UserType::CHAIN_MANAGER) {
            $chainId = $user->chainManager?->chain_id;
            if (! $chainId) {
                return [];
            }

            return $user->chainManager
                ->chain
                ?->restaurants()
                ->pluck('id')
                ->toArray() ?? [];
        }

        return [];
    }

    private function canManageRestaurant(User $user, string $restaurantId): bool
    {
        return in_array($restaurantId, $this->resolveManagedRestaurantIds($user), true);
    }

    private function resolveAuthenticatedUser(): User
    {
        $user = auth()->user();

        if (! $user && app()->environment(['local', 'testing'])) {
            $devUserId = request()->header('X-Dev-User-Id');
            if ($devUserId) {
                $user = User::query()->find($devUserId);
            }
        }

        if (! $user) {
            throw new AuthenticationException('Authentication required.');
        }

        if (! in_array($user->user_type, [UserType::LOCAL_MANAGER, UserType::CHAIN_MANAGER], true)) {
            throw new UserError('Only restaurant managers can manage menu products.');
        }

        return $user->loadMissing(['localManager', 'chainManager.chain.restaurants']);
    }
}
