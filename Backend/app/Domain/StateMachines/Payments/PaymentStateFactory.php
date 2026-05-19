<?php

namespace App\Domain\StateMachines\Payments;

use App\Enums\PaymentStatus;

class PaymentStateFactory
{
    public static function from(PaymentStatus|string $status): PaymentState
    {
        $status = $status instanceof PaymentStatus ? $status : PaymentStatus::from($status);

        return match ($status) {
            PaymentStatus::PENDING => new PendingPaymentState(),
            PaymentStatus::COMPLETED => new CompletedPaymentState(),
            PaymentStatus::FAILED => new FailedPaymentState(),
            PaymentStatus::CANCELLED => new CancelledPaymentState(),
        };
    }
}
