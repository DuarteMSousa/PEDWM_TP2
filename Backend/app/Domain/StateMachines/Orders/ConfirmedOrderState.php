<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class ConfirmedOrderState extends AbstractOrderState
{
    public function status(): OrderStatus
    {
        return OrderStatus::CONFIRMED;
    }

    protected function allowedTransitions(): array
    {
        return [OrderStatus::PREPARING, OrderStatus::CANCELLED];
    }
}
