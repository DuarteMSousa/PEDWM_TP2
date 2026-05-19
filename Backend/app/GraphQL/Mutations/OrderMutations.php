<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Order\CheckoutDTO;
use App\Enums\PaymentMethod;
use App\Services\OrderService\OrderServiceInterface;

class OrderMutations
{
    public function __construct(private OrderServiceInterface $orderService) {}

    public function checkoutOrder($_, array $args): array
    {
        $input = $args['input'];

        return $this->orderService->checkoutOrder($input['user_id'], new CheckoutDTO(
            payment_method: PaymentMethod::from($input['payment_method']),
            cart_id: $input['cart_id'] ?? null,
            address_id: $input['address_id'] ?? null,
            coupon_code: $input['coupon_code'] ?? null,
        ));
    }

    public function cancelOrderByClient($_, array $args)
    {
        return $this->orderService->cancelOrderByClient($args['user_id'], $args['order_id'], $args['reason'] ?? null);
    }

    public function acceptOrderByRestaurant($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->acceptOrderByRestaurant($input['actor_user_id'], $input['order_id']);
    }

    public function rejectOrderByRestaurant($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->rejectOrderByRestaurant($input['actor_user_id'], $input['order_id'], $input['reason'] ?? null);
    }

    public function startPreparingOrder($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->startPreparingOrder($input['actor_user_id'], $input['order_id']);
    }

    public function updateOrderItemStatus($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->updateOrderItemStatus($input['actor_user_id'], $input['order_item_id'], $input['status']);
    }

    public function markOrderReady($_, array $args)
    {
        $input = $args['input'];

        return $this->orderService->markOrderReady($input['actor_user_id'], $input['order_id']);
    }

    public function repeatClientOrder($_, array $args)
    {
        return $this->orderService->repeatClientOrder($args['user_id'], $args['order_id']);
    }
}
