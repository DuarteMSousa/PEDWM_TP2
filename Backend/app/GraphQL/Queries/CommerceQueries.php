<?php

namespace App\GraphQL\Queries;

use App\Enums\OrderStatus;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\RestaurantProduct;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;

class CommerceQueries
{
    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function restaurants(null $_, array $args): array
    {
        $page = max(1, (int) ($args['page'] ?? 1));
        $perPage = max(1, min((int) ($args['per_page'] ?? 20), 100));
        $q = trim((string) ($args['q'] ?? ''));
        $city = trim((string) ($args['city'] ?? ''));

        $query = Restaurant::query()->with(['chain', 'address']);

        if ($q !== '') {
            $query->where('name', 'like', "%{$q}%");
        }

        if ($city !== '') {
            $query->whereHas('address', fn ($addressQuery) => $addressQuery->where('city', 'like', "%{$city}%"));
        }

        return $query
            ->orderBy('name')
            ->forPage($page, $perPage)
            ->get()
            ->map(fn (Restaurant $restaurant): array => [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'chain_name' => $restaurant->chain?->name,
                'city' => $restaurant->address?->city,
                'country' => $restaurant->address?->country,
                'delivery_radius' => (float) $restaurant->delivery_radius,
                'rating' => $this->computeRating((float) $restaurant->rating_sum, (int) $restaurant->rating_count),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function restaurantMenu(null $_, array $args): array
    {
        $restaurantId = $args['restaurant_id'];

        return RestaurantProduct::query()
            ->with(['product.category'])
            ->where('restaurant_id', $restaurantId)
            ->orderBy('created_at')
            ->get()
            ->map(fn (RestaurantProduct $restaurantProduct): array => [
                'restaurant_product_id' => $restaurantProduct->id,
                'product_id' => $restaurantProduct->product_id,
                'category' => $restaurantProduct->product?->category?->name,
                'name' => $restaurantProduct->product?->name,
                'description' => $restaurantProduct->product?->description,
                'price' => (float) ($restaurantProduct->local_price ?? $restaurantProduct->product?->price ?? 0),
                'is_available' => (bool) $restaurantProduct->is_available,
                'estimated_preparation_time_min' => $restaurantProduct->estimated_preparation_time_min,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function myCart(null $_, array $args): ?array
    {
        $user = $this->resolveAuthenticatedUser();

        /** @var Cart|null $cart */
        $cart = Cart::query()
            ->with(['items.restaurantProduct.product', 'items.options.productOption'])
            ->where('user_id', $user->id)
            ->first();

        if (! $cart) {
            return null;
        }

        return $this->buildCartPayload($cart);
    }

    /**
     * @param  array<string, mixed>  $args
     * @return array<int, array<string, mixed>>
     */
    public function myOrders(null $_, array $args): array
    {
        $user = $this->resolveAuthenticatedUser();
        $limit = max(1, min((int) ($args['limit'] ?? 20), 100));
        $activeOnly = (bool) ($args['active_only'] ?? false);

        $query = Order::query()
            ->with(['delivery', 'payment'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at');

        if ($activeOnly) {
            $query->whereIn('status', [
                OrderStatus::PENDING->value,
                OrderStatus::CONFIRMED->value,
                OrderStatus::PREPARING->value,
                OrderStatus::READY->value,
                OrderStatus::OUT_FOR_DELIVERY->value,
            ]);
        }

        return $query
            ->limit($limit)
            ->get()
            ->map(fn (Order $order): array => [
                'id' => $order->id,
                'status' => $order->status->value,
                'total' => (float) $order->total,
                'restaurant_id' => $order->restaurant_id,
                'restaurant_name' => $order->restaurant_name_snapshot,
                'delivery_status' => $order->delivery?->status?->value,
                'payment_status' => $order->payment?->status?->value,
                'created_at' => $order->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function buildCartPayload(Cart $cart): array
    {
        $items = $cart->items->map(function ($item): array {
            $product = $item->restaurantProduct?->product;
            $basePrice = (float) ($item->unit_price ?? $item->restaurantProduct?->local_price ?? $product?->price ?? 0);
            $optionsTotal = $item->options->sum(fn ($option) => (float) ($option->productOption?->extra_price ?? 0));
            $lineTotal = ((float) $basePrice + (float) $optionsTotal) * (int) $item->quantity;

            return [
                'id' => $item->id,
                'restaurant_product_id' => $item->restaurant_product_id,
                'product_name' => $product?->name ?? 'Produto',
                'quantity' => (int) $item->quantity,
                'unit_price' => $basePrice,
                'line_total' => $lineTotal,
            ];
        })->values()->all();

        $total = array_sum(array_map(fn ($item) => (float) $item['line_total'], $items));
        $restaurantId = $cart->items->first()?->restaurantProduct?->restaurant_id;

        return [
            'id' => $cart->id,
            'user_id' => $cart->user_id,
            'restaurant_id' => $restaurantId,
            'total' => $total,
            'items' => $items,
        ];
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

        return $user;
    }

    private function computeRating(float $ratingSum, int $ratingCount): ?float
    {
        if ($ratingCount <= 0) {
            return null;
        }

        return round($ratingSum / $ratingCount, 2);
    }
}
