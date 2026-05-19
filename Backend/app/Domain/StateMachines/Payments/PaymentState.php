<?php

namespace App\Domain\StateMachines\Payments;

use App\Enums\PaymentStatus;
use App\Models\Payment;

interface PaymentState
{
    public function status(): PaymentStatus;

    public function canTransitionTo(PaymentStatus $next): bool;

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function transition(Payment $payment, PaymentStatus $next, array $attributes = []): void;
}
