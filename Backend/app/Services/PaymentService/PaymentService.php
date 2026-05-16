<?php

namespace App\Services\PaymentService;

use App\DTOs\Payment\CreatePaymentDTO;
use App\Enums\PaymentEventType;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

class PaymentService implements PaymentServiceInterface
{
    public function find(string $id): ?Payment
    {
        return Payment::query()->with('events')->find($id);
    }

    public function forOrder(string $orderId): ?Payment
    {
        return Payment::query()->with('events')->where('order_id', $orderId)->first();
    }

    public function events(string $paymentId)
    {
        return Payment::query()->findOrFail($paymentId)->events()->orderBy('timestamp')->get();
    }

    public function create(CreatePaymentDTO $data): Payment
    {
        return Payment::query()->create([
            'order_id' => $data->order_id,
            'method' => $data->method->value,
            'amount' => $data->amount,
            'status' => PaymentStatus::PENDING->value,
        ])->load('events');
    }

    public function confirm(string $paymentId, ?string $transactionId): Payment
    {
        return $this->setStatus($paymentId, PaymentStatus::COMPLETED, PaymentEventType::PAYMENT_COMPLETED, [
            'transaction_id' => $transactionId,
            'paid_at' => now(),
        ]);
    }

    public function fail(string $paymentId, ?string $reason): Payment
    {
        return $this->setStatus($paymentId, PaymentStatus::FAILED, PaymentEventType::PAYMENT_FAILED, [
            'reason' => $reason,
        ]);
    }

    public function refund(string $paymentId, ?string $reason): Payment
    {
        return $this->setStatus($paymentId, PaymentStatus::REFUNDED, null, [
            'reason' => $reason,
        ]);
    }

    private function setStatus(string $paymentId, PaymentStatus $status, ?PaymentEventType $eventType, array $payload): Payment
    {
        return DB::transaction(function () use ($paymentId, $status, $eventType, $payload) {
            $payment = Payment::query()->findOrFail($paymentId);
            $payment->fill([
                'status' => $status->value,
                'transaction_id' => $payload['transaction_id'] ?? $payment->transaction_id,
                'paid_at' => $payload['paid_at'] ?? $payment->paid_at,
            ]);
            $payment->save();

            if ($eventType) {
                $payment->events()->create([
                    'event_type' => $eventType->value,
                    'timestamp' => now(),
                    'payload' => $payload,
                ]);
            }

            return $payment->refresh()->load('events');
        });
    }
}
