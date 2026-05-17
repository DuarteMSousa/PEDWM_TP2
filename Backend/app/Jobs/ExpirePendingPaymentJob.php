<?php

namespace App\Jobs;

use App\Enums\PaymentStatus;
use App\Models\Payment;
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
        $payment = Payment::query()->whereKey($this->paymentId)->first();

        if (
            ! $payment
            || $payment->status !== PaymentStatus::PENDING
            || $payment->expired_at === null
            || $payment->expired_at->isFuture()
        ) {
            return;
        }

        app(PaymentServiceInterface::class)->expire($payment->id);
    }
}
