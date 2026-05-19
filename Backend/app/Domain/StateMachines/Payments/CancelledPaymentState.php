<?php

namespace App\Domain\StateMachines\Payments;

use App\Enums\PaymentStatus;

class CancelledPaymentState extends AbstractPaymentState
{
    public function status(): PaymentStatus
    {
        return PaymentStatus::CANCELLED;
    }

    protected function allowedTransitions(): array
    {
        return [];
    }
}
