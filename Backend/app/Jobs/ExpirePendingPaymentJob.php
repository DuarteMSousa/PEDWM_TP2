<?php

namespace App\Jobs;

use App\Enums\PaymentStatus;
use App\Services\PaymentService\PaymentServiceInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ExpirePendingPaymentJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $paymentId)
    {
    }

    public function handle(): void
    {
        $paymentService = app(PaymentServiceInterface::class);
        $payment = $paymentService->getPaymentById($this->paymentId);

        if (
            ! $payment
            || $payment->status !== PaymentStatus::PENDING
            || $payment->expired_at === null
            || $payment->expired_at->isFuture()
        ) {
            return;
        }

        $paymentService->expirePayment($payment->id);
    }
}
