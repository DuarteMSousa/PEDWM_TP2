<?php

namespace App\Services\CartService;

use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\UpdateCartItemDTO;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductOption;
use App\Models\RestaurantProduct;
use Illuminate\Support\Facades\DB;

class CartService implements CartServiceInterface
{
    private array $with = ['items.restaurantProduct.product', 'items.options.productOption'];

    public function forUser(string $userId): Cart
    {
        return Cart::query()
            ->firstOrCreate(['user_id' => $userId], ['total' => 0])
            ->load($this->with);
    }

    public function findForUser(string $userId, string $cartId): ?Cart
    {
        return Cart::query()
            ->with($this->with)
            ->where('user_id', $userId)
            ->find($cartId);
    }

    public function addItem(string $clientUserId, AddCartItemDTO $data): Cart
    {
        return DB::transaction(function () use ($clientUserId, $data) {
            $cart = $this->forUser($clientUserId);
            $restaurantProduct = RestaurantProduct::query()
                ->with('product')
                ->findOrFail($data->restaurant_product_id);

            $optionIds = $data->option_ids;
            $options = ProductOption::query()->whereIn('id', $optionIds)->get();
            $unitPrice = $restaurantProduct->local_price ?? $restaurantProduct->product->price;
            $quantity = max(1, $data->quantity);

            $item = CartItem::query()->create([
                'cart_id' => $cart->id,
                'restaurant_product_id' => $restaurantProduct->id,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => ($unitPrice + $options->sum('extra_price')) * $quantity,
            ]);

            foreach ($options as $option) {
                $item->options()->create([
                    'product_option_id' => $option->id,
                    'extra_price' => $option->extra_price,
                ]);
            }

            return $this->recalculate($cart->id);
        });
    }

    public function updateItem(string $clientUserId, string $cartItemId, UpdateCartItemDTO $data): Cart
    {
        return DB::transaction(function () use ($clientUserId, $cartItemId, $data) {
            $item = CartItem::query()
                ->whereHas('cart', fn ($query) => $query->where('user_id', $clientUserId))
                ->findOrFail($cartItemId);

            if ($data->option_ids !== null) {
                $item->options()->delete();
                $options = ProductOption::query()->whereIn('id', $data->option_ids)->get();

                foreach ($options as $option) {
                    $item->options()->create([
                        'product_option_id' => $option->id,
                        'extra_price' => $option->extra_price,
                    ]);
                }
            } else {
                $options = $item->options;
            }

            $quantity = max(1, $data->quantity);
            $item->update([
                'quantity' => $quantity,
                'total_price' => ($item->unit_price + $options->sum('extra_price')) * $quantity,
            ]);

            return $this->recalculate($item->cart_id);
        });
    }

    public function removeItem(string $userId, string $cartItemId): Cart
    {
        return DB::transaction(function () use ($userId, $cartItemId) {
            $item = CartItem::query()
                ->whereHas('cart', fn ($query) => $query->where('user_id', $userId))
                ->findOrFail($cartItemId);
            $cartId = $item->cart_id;
            $item->delete();

            return $this->recalculate($cartId);
        });
    }

    public function clear(string $userId): bool
    {
        $cart = $this->forUser($userId);
        $cart->items()->delete();
        $cart->update(['total' => 0]);

        return true;
    }

    public function recalculate(string $cartId): Cart
    {
        $cart = Cart::query()->with($this->with)->findOrFail($cartId);
        $cart->update(['total' => $cart->items->sum('total_price')]);

        return $cart->refresh()->load($this->with);
    }
}
