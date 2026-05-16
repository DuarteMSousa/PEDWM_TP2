<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class PendingOrderState extends AbstractOrderState
{
    public function status(): OrderStatus
    {
        return OrderStatus::PENDING;
    }

    protected function allowedTransitions(): array
    {
        return [OrderStatus::CONFIRMED, OrderStatus::CANCELLED];
    }
}
