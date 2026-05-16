<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;

class CancelledOrderState extends AbstractOrderState
{
    public function status(): OrderStatus
    {
        return OrderStatus::CANCELLED;
    }

    protected function allowedTransitions(): array
    {
        return [];
    }
}
