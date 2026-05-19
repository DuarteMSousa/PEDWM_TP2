<?php

namespace App\Domain\StateMachines\Payments;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Validation\ValidationException;

abstract class AbstractPaymentState implements PaymentState
{
    /**
     * @return array<int, PaymentStatus>
     */
    abstract protected function allowedTransitions(): array;

    public function canTransitionTo(PaymentStatus $next): bool
    {
        return in_array($next, $this->allowedTransitions(), true);
    }

    public function transition(Payment $payment, PaymentStatus $next, array $attributes = []): void
    {
        if (! $this->canTransitionTo($next)) {
            throw ValidationException::withMessages([
                'status' => "Invalid payment transition from {$this->status()->value} to {$next->value}.",
            ]);
        }

        $payment->fill(array_merge($attributes, ['status' => $next->value]));
    }
}
