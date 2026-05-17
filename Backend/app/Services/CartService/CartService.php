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
use Illuminate\Validation\ValidationException;

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
            ->with(['product.optionGroups.options'])
            ->findOrFail($data->restaurant_product_id);

        $optionIds = $data->option_ids;
        $options = ProductOption::query()->whereIn('id', $optionIds)->get();
        $this->validateRestaurantProductCanBeAdded($cart, $restaurantProduct);
        $this->validateOptionsForProduct($restaurantProduct, $optionIds, $options);

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
            ->with('restaurantProduct.product.optionGroups.options')
            ->whereHas('cart', fn ($query) => $query->where('user_id', $clientUserId))
            ->findOrFail($cartItemId);

        if ($data->option_ids !== null) {
            $item->options()->delete();
            $options = ProductOption::query()->whereIn('id', $data->option_ids)->get();
            $this->validateOptionsForProduct($item->restaurantProduct, $data->option_ids, $options);

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

    private function validateRestaurantProductCanBeAdded(Cart $cart, RestaurantProduct $restaurantProduct): void
    {
        if (! $restaurantProduct->is_available) {
            throw ValidationException::withMessages([
                'restaurant_product_id' => 'Product is not available in this restaurant.',
            ]);
        }

        $cart->loadMissing('items.restaurantProduct');
        $existingRestaurantId = $cart->items
            ->map(fn (CartItem $item) => $item->restaurantProduct?->restaurant_id)
            ->filter()
            ->first();

        if ($existingRestaurantId && $existingRestaurantId !== $restaurantProduct->restaurant_id) {
            throw ValidationException::withMessages([
                'restaurant_product_id' => 'Cart can only contain products from one restaurant.',
            ]);
        }
    }

    private function validateOptionsForProduct(RestaurantProduct $restaurantProduct, array $optionIds, $options): void
    {
        $restaurantProduct->loadMissing('product.optionGroups.options');

        $uniqueOptionIds = array_values(array_unique($optionIds));
        if ($options->count() !== count($uniqueOptionIds)) {
            throw ValidationException::withMessages([
                'option_ids' => 'One or more selected options do not exist.',
            ]);
        }

        $validOptionIds = $restaurantProduct->product->optionGroups
            ->flatMap(fn ($group) => $group->options->pluck('id'))
            ->all();

        foreach ($uniqueOptionIds as $optionId) {
            if (! in_array($optionId, $validOptionIds, true)) {
                throw ValidationException::withMessages([
                    'option_ids' => 'Selected options must belong to the chosen product.',
                ]);
            }
        }

        foreach ($restaurantProduct->product->optionGroups as $group) {
            $selectedCount = $options
                ->where('option_group_id', $group->id)
                ->count();

            if ($selectedCount < $group->min_options) {
                throw ValidationException::withMessages([
                    'option_ids' => "Select at least {$group->min_options} option(s) for {$group->name}.",
                ]);
            }

            if ($selectedCount > $group->max_options) {
                throw ValidationException::withMessages([
                    'option_ids' => "Select at most {$group->max_options} option(s) for {$group->name}.",
                ]);
            }
        }
    }
}
