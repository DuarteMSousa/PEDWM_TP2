<?php

namespace App\Services\CartService;

use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\UpdateCartItemDTO;
use App\Models\Cart;

interface CartServiceInterface
{
    public function forUser(string $userId): Cart;

    public function findForUser(string $userId, string $cartId): ?Cart;

    public function addItem(string $clientUserId, AddCartItemDTO $data): Cart;

    public function updateItem(string $clientUserId, string $cartItemId, UpdateCartItemDTO $data): Cart;

    public function removeItem(string $userId, string $cartItemId): Cart;

    public function clear(string $userId): bool;

    public function recalculate(string $cartId): Cart;
}
