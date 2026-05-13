<?php

namespace App\Repositories\CartRepository;

use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\CartItemOptionDTO;
use App\DTOs\Cart\CreateCartDTO;
use App\DTOs\Cart\UpdateCartItemDTO;

interface CartRepositoryInterface
{
    public function findById(string $id);

    public function findByUserId(string $userId);

    public function createCart(CreateCartDTO $data);

    public function addCartItem(AddCartItemDTO $data);

    public function updateCartItem(string $cartItemId, UpdateCartItemDTO $data);

    public function addCartItemOption(CartItemOptionDTO $data);

    public function deleteCartItem(string $cartItemId);

    public function deleteCart(string $id);
}
