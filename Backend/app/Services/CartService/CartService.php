<?php

namespace App\Services\CartService;

use App\Aspects\Transactional;
use App\Domain\Pricing\PricingCalculator;
use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\UpdateCartItemDTO;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductOption;
use App\Models\RestaurantProduct;

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

    #[Transactional]
    public function addItem(string $clientUserId, AddCartItemDTO $data): Cart
    {
        $cart = $this->forUser($clientUserId);
        $restaurantProduct = RestaurantProduct::query()
            ->with('product')
            ->findOrFail($data->restaurant_product_id);

        $optionIds = $data->option_ids;
        $options = ProductOption::query()->whereIn('id', $optionIds)->get();
        $unitPrice = $restaurantProduct->local_price ?? $restaurantProduct->product->price;
        $quantity = PricingCalculator::normalizeQuantity($data->quantity);
        $lineTotal = PricingCalculator::calculateCartItemTotal(
            (float) $unitPrice,
            $options->pluck('extra_price'),
            $quantity
        );

        $item = CartItem::query()->create([
            'cart_id' => $cart->id,
            'restaurant_product_id' => $restaurantProduct->id,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'total_price' => $lineTotal,
        ]);

        foreach ($options as $option) {
            $item->options()->create([
                'product_option_id' => $option->id,
                'extra_price' => $option->extra_price,
            ]);
        }

        return $this->recalculate($cart->id);
    }

    #[Transactional]
    public function updateItem(string $clientUserId, string $cartItemId, UpdateCartItemDTO $data): Cart
    {
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

        $quantity = PricingCalculator::normalizeQuantity($data->quantity);
        $lineTotal = PricingCalculator::calculateCartItemTotal(
            (float) $item->unit_price,
            $options->pluck('extra_price'),
            $quantity
        );
        $item->update([
            'quantity' => $quantity,
            'total_price' => $lineTotal,
        ]);

        return $this->recalculate($item->cart_id);
    }

    #[Transactional]
    public function removeItem(string $userId, string $cartItemId): Cart
    {
        $item = CartItem::query()
            ->whereHas('cart', fn ($query) => $query->where('user_id', $userId))
            ->findOrFail($cartItemId);
        $cartId = $item->cart_id;
        $item->delete();

        return $this->recalculate($cartId);
    }

    #[Transactional]
    public function clear(string $userId): bool
    {
        $cart = $this->forUser($userId);
        $cart->items()->delete();
        $cart->update(['total' => 0]);

        return true;
    }

    #[Transactional]
    public function recalculate(string $cartId): Cart
    {
        $cart = Cart::query()->with($this->with)->findOrFail($cartId);
        $cart->update(['total' => PricingCalculator::calculateSubtotal($cart->items->pluck('total_price'))]);

        return $cart->refresh()->load($this->with);
    }
}
