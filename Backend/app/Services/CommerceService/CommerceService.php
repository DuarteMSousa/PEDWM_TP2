<?php

namespace App\Services\CommerceService;

use App\DTOs\Restaurant\SearchRestaurantsDTO;
use App\Enums\OrderStatus;
use App\Models\Cart;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\RestaurantProduct;
use App\Repositories\CartRepository\CartRepositoryInterface;
use App\Repositories\OrderRepository\OrderRepositoryInterface;
use App\Repositories\RestaurantProductRepository\RestaurantProductRepositoryInterface;
use App\Repositories\RestaurantRepository\RestaurantRepositoryInterface;

class CommerceService implements CommerceServiceInterface
{
    public function __construct(
        private RestaurantRepositoryInterface $restaurantRepository,
        private RestaurantProductRepositoryInterface $restaurantProductRepository,
        private CartRepositoryInterface $cartRepository,
        private OrderRepositoryInterface $orderRepository,
    ) {
    }

    public function listRestaurants(array $args): array
    {
        $page = max(1, (int) ($args['page'] ?? 1));
        $perPage = max(1, min((int) ($args['per_page'] ?? 20), 100));

        $filters = SearchRestaurantsDTO::from([
            'q' => trim((string) ($args['q'] ?? '')),
            'city' => trim((string) ($args['city'] ?? '')),
            'pageNumber' => $page,
            'pageSize' => $perPage,
        ]);

        $restaurants = $this->restaurantRepository->searchRestaurants($filters);

        return $restaurants
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

    public function getRestaurantMenu(string $restaurantId): array
    {
        return $this->restaurantProductRepository
            ->findByRestaurantId($restaurantId)
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

    public function getUserCart(?string $userId): ?array
    {
        if ($userId === null) {
            return null;
        }

        /** @var Cart|null $cart */
        $cart = $this->cartRepository->findByUserId($userId);

        if (! $cart) {
            return null;
        }

        return $this->buildCartPayload($cart);
    }

    public function listUserOrders(string $userId, int $limit, bool $activeOnly): array
    {
        $statuses = null;

        if ($activeOnly) {
            $statuses = [
                OrderStatus::PENDING->value,
                OrderStatus::CONFIRMED->value,
                OrderStatus::PREPARING->value,
                OrderStatus::READY->value,
                OrderStatus::OUT_FOR_DELIVERY->value,
            ];
        }

        $orders = $this->orderRepository->findByUserIdWithFilters($userId, $limit, $statuses);

        return $orders
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

    private function buildCartPayload(Cart $cart): array
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

    private function computeRating(float $ratingSum, int $ratingCount): ?float
    {
        if ($ratingCount <= 0) {
            return null;
        }

        return round($ratingSum / $ratingCount, 2);
    }
}

