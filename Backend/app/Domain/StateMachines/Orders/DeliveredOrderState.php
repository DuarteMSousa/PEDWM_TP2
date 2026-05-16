<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class DeliveredOrderState extends AbstractOrderState
{
    public function status(): OrderStatus
    {
        return OrderStatus::DELIVERED;
    }

    protected function allowedTransitions(): array
    {
        return [];
    }
}
