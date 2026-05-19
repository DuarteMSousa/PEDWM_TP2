<?php

namespace App\Domain\StateMachines\Payments;

use App\Enums\PaymentStatus;

class PendingPaymentState extends AbstractPaymentState
{
    public function status(): PaymentStatus
    {
        return PaymentStatus::PENDING;
    }

    protected function allowedTransitions(): array
    {
        return [
            PaymentStatus::COMPLETED,
            PaymentStatus::FAILED,
            PaymentStatus::CANCELLED,
        ];
    }
}
