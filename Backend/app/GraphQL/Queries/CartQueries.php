<?php

namespace App\GraphQL\Queries;

use App\Services\CartService\CartServiceInterface;

class CartQueries
{
    public function __construct(private CartServiceInterface $cartService) {}

    public function getCartByUserId($_, array $args)
    {
        return $this->cartService->getCartByUserId($args['user_id']);
    }

    public function getCartByUserIdAndCartId($_, array $args)
    {
        return $this->cartService->getCartByUserIdAndCartId($args['user_id'], $args['cart_id']);
    }
}
