<?php

namespace App\GraphQL\Queries;

use App\Services\CartService\CartServiceInterface;

class CartQueries
{
    public function __construct(private CartServiceInterface $cartService)
    {
    }

    public function clientCart($_, array $args)
    {
        return $this->cartService->forUser($args['user_id']);
    }

    public function clientCartById($_, array $args)
    {
        return $this->cartService->findForUser($args['user_id'], $args['cart_id']);
    }
}
