<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class OutForDeliveryOrderState extends AbstractOrderState
{
    public function status(): OrderStatus
    {
        return OrderStatus::OUT_FOR_DELIVERY;
    }

    protected function allowedTransitions(): array
    {
        return [OrderStatus::DELIVERED, OrderStatus::CANCELLED];
    }
}
