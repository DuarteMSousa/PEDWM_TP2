<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;

interface OrderState
{
    public function status(): OrderStatus;

    public function canTransitionTo(OrderStatus $next): bool;

    public function transition(Order $order, OrderStatus $next): void;
}
