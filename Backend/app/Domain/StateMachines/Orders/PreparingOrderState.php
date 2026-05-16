<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class PreparingOrderState extends AbstractOrderState
{
    public function status(): OrderStatus
    {
        return OrderStatus::PREPARING;
    }

    protected function allowedTransitions(): array
    {
        return [OrderStatus::READY, OrderStatus::CANCELLED];
    }
}
