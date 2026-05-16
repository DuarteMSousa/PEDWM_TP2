<?php

namespace App\Repositories\CartRepository;

use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\CartItemOptionDTO;
use App\DTOs\Cart\CreateCartDTO;
use App\DTOs\Cart\UpdateCartItemDTO;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CartItemOption;

class CartRepository implements CartRepositoryInterface
{
    public function findById(string $id)
    {
        return Cart::with(['items.restaurantProduct.product', 'items.options.productOption'])->find($id);
    }

    public function findByUserId(string $userId)
    {
        return Cart::with(['items.restaurantProduct.product', 'items.options.productOption'])
            ->where('user_id', $userId)
            ->first();
    }

    public function createCart(CreateCartDTO $data)
    {
        return Cart::create($data->toArray());
    }

    public function addCartItem(string $cartId, AddCartItemDTO $data, float $unitPrice, float $totalPrice)
    {
        return CartItem::create([
            'cart_id' => $cartId,
            'restaurant_product_id' => $data->restaurant_product_id,
            'quantity' => $data->quantity,
            'unit_price' => $unitPrice,
            'total_price' => $totalPrice,
        ]);
    }

    public function updateCartItem(string $cartItemId, UpdateCartItemDTO $data, float $totalPrice)
    {
        $cartItem = CartItem::find($cartItemId);

        if (!$cartItem) {
            return null;
        }

        $cartItem->update([
            'quantity' => $data->quantity,
            'total_price' => $totalPrice,
        ]);

        return $cartItem;
    }

    public function addCartItemOption(CartItemOptionDTO $data)
    {
        return CartItemOption::create([
            'cart_item_id' => $data->cart_item_id,
            'product_option_id' => $data->option_id,
        ]);
    }

    public function deleteCartItem(string $cartItemId)
    {
        $cartItem = CartItem::find($cartItemId);

        if (!$cartItem) {
            return false;
        }

        $cartItem->delete();

        return true;
    }

    public function deleteCart(string $id)
    {
        $cart = Cart::find($id);

        if (!$cart) {
            return false;
        }

        $cart->delete();

        return true;
    }
}
