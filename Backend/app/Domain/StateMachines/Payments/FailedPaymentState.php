<?php

namespace App\Domain\StateMachines\Payments;

use App\Enums\PaymentStatus;

class FailedPaymentState extends AbstractPaymentState
{
    public function status(): PaymentStatus
    {
        return PaymentStatus::FAILED;
    }

    protected function allowedTransitions(): array
    {
        return [];
    }
}
