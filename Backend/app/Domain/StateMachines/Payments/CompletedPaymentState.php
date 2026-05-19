<?php

namespace App\Domain\StateMachines\Payments;

use App\Enums\PaymentStatus;

class CompletedPaymentState extends AbstractPaymentState
{
    public function status(): PaymentStatus
    {
        return PaymentStatus::COMPLETED;
    }

    protected function allowedTransitions(): array
    {
        return [
        ];
    }
}
