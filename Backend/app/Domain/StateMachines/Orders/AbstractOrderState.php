<?php

namespace App\Domain\StateMachines\Orders;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Validation\ValidationException;

abstract class AbstractOrderState implements OrderState
{
    /**
     * @return array<int, OrderStatus>
     */
    abstract protected function allowedTransitions(): array;

    public function canTransitionTo(OrderStatus $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function transition(Order $order, OrderStatus $next): void
    {
        if (! $this->canTransitionTo($next)) {
            throw ValidationException::withMessages([
                'status' => "Invalid order transition from {$this->status()->value} to {$next->value}.",
            ]);
        }

        $order->update(['status' => $next->value]);
    }
}
