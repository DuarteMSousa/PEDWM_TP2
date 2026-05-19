<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class ReadyOrderState extends AbstractOrderState
{
    public function status(): OrderStatus
    {
        return OrderStatus::READY;
    }

    protected function allowedTransitions(): array
    {
        return [OrderStatus::OUT_FOR_DELIVERY, OrderStatus::CANCELLED];
    }
}
