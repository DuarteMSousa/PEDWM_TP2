<?php

namespace App\Domain\StateMachines\Deliveries;

use App\Enums\DeliveryStatus;
use App\Models\Delivery;
use Illuminate\Validation\ValidationException;

abstract class AbstractDeliveryState implements DeliveryState
{
    /**
     * @return array<int, DeliveryStatus>
     */
    abstract protected function allowedTransitions(): array;

    public function canTransitionTo(DeliveryStatus $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function transition(Delivery $delivery, DeliveryStatus $next, array $extra = []): void
    {
        if (! $this->canTransitionTo($next)) {
            throw ValidationException::withMessages([
                'status' => "Invalid delivery transition from {$this->status()->value} to {$next->value}.",
            ]);
        }

        $delivery->fill([
            'status' => $next->value,
            ...$extra,
        ]);
        $delivery->save();
    }
}
