<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Cart\AddCartItemDTO;
use App\DTOs\Cart\UpdateCartItemDTO;
use App\Services\CartService\CartServiceInterface;

class CartMutations
{
    public function __construct(private CartServiceInterface $cartService)
    {
    }

    public function createClientCart($_, array $args)
    {
        return $this->cartService->forUser($args['user_id']);
    }

    public function addClientCartItem($_, array $args)
    {
        $input = $args['input'];

        return $this->cartService->addItem($input['user_id'], new AddCartItemDTO(
            restaurant_product_id: $input['restaurant_product_id'],
            quantity: $input['quantity'],
            option_ids: $input['option_ids'] ?? [],
        ));
    }

    public function updateClientCartItem($_, array $args)
    {
        $input = $args['input'];

        return $this->cartService->updateItem($input['user_id'], $args['cart_item_id'], new UpdateCartItemDTO(
            quantity: $input['quantity'],
            option_ids: $input['option_ids'] ?? null,
        ));
    }

    public function removeClientCartItem($_, array $args)
    {
        return $this->cartService->removeItem($args['user_id'], $args['cart_item_id']);
    }

    public function clearClientCart($_, array $args): bool
    {
        return $this->cartService->clear($args['user_id']);
    }
}
