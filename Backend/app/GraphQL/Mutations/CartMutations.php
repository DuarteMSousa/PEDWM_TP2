<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\UpdateCartItemDTO;
use App\Services\CartService\CartServiceInterface;

class CartMutations
{
    public function __construct(private CartServiceInterface $cartService) {}

    public function getCartByUserId($_, array $args)
    {
        return $this->cartService->getCartByUserId($args['user_id']);
    }

    public function addCartItem($_, array $args)
    {
        $input = $args['input'];

        return $this->cartService->addCartItem($input['user_id'], new AddCartItemDTO(
            restaurant_product_id: $input['restaurant_product_id'],
            quantity: $input['quantity'],
            option_ids: $input['option_ids'] ?? [],
        ));
    }

    public function updateCartItem($_, array $args)
    {
        $input = $args['input'];

        return $this->cartService->updateCartItem($input['user_id'], $args['cart_item_id'], new UpdateCartItemDTO(
            quantity: $input['quantity'],
            option_ids: $input['option_ids'] ?? null,
        ));
    }

    public function removeCartItem($_, array $args)
    {
        return $this->cartService->removeCartItem($args['user_id'], $args['cart_item_id']);
    }

    public function clearCart($_, array $args): bool
    {
        return $this->cartService->clearCart($args['user_id']);
    }
}
