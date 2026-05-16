<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Order\CheckoutDTO;
use App\Services\OrderService\OrderServiceInterface;

class OrderMutations
{
    public function __construct(private OrderServiceInterface $orderService)
    {
    }

    public function checkout($_, array $args): array
    {
        $input = $args['input'];

        return $this->orderService->checkout($input['user_id'], new CheckoutDTO(
            payment_method: \App\Enums\PaymentMethod::from($input['payment_method']),
            cart_id: $input['cart_id'] ?? null,
            address_id: $input['address_id'] ?? null,
        ));
    }

    public function cancelClientOrder($_, array $args)
    {
        return $this->orderService->cancelByClient($args['user_id'], $args['order_id'], $args['reason'] ?? null);
    }

    public function acceptRestaurantOrder($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->acceptByRestaurant($input['actor_user_id'], $input['order_id']);
    }

    public function rejectRestaurantOrder($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->rejectByRestaurant($input['actor_user_id'], $input['order_id'], $input['reason'] ?? null);
    }

    public function startPreparingOrder($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->startPreparing($input['actor_user_id'], $input['order_id']);
    }

    public function updateOrderItemStatus($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->updateItemStatus($input['actor_user_id'], $input['order_item_id'], $input['status']);
    }

    public function markOrderReady($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->markReady($input['actor_user_id'], $input['order_id']);
    }

    public function cancelRestaurantOrder($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->rejectByRestaurant($input['actor_user_id'], $input['order_id'], $input['reason'] ?? null);
    }

    public function repeatClientOrder($_, array $args)
    {
        return $this->orderService->repeatOrder($args['user_id'], $args['order_id']);
    }
}
