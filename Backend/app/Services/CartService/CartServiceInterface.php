<?php

namespace App\Services\CartService;

use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\UpdateCartItemDTO;
use App\Models\Cart;

interface CartServiceInterface
{
    public function getCartByUserId(string $userId): Cart;

    public function getCartByUserIdAndCartId(string $userId, string $cartId): ?Cart;

    public function addCartItem(string $clientUserId, AddCartItemDTO $data): Cart;

    public function updateCartItem(string $clientUserId, string $cartItemId, UpdateCartItemDTO $data): Cart;

    public function removeCartItem(string $userId, string $cartItemId): Cart;

    public function clearCart(string $userId): bool;

    public function recalculateCartTotal(string $cartId): Cart;
}
