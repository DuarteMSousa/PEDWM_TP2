<?php

namespace App\Repositories\PaymentRepository;

use App\DTOs\Payment\CreatePaymentDTO;
use App\DTOs\Payment\CreatePaymentEventDTO;
use App\DTOs\Payment\UpdatePaymentDTO;
use App\Enums\PaymentStatus;
use App\Models\Payment;

class PaymentRepository implements PaymentRepositoryInterface
{
    public function getById(string $id): ?Payment
    {
        return Payment::query()->with('events')->find($id);
    }

    public function getByOrderId(string $orderId): ?Payment
    {
        return Payment::query()->with('events')->where('order_id', $orderId)->first();
    }

    public function getByIdOrFail(string $id, bool $lock = false): Payment
    {
        $query = Payment::query();

        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->findOrFail($id);
    }

    public function getEvents(string $paymentId)
    {
        return Payment::query()->findOrFail($paymentId)->events()->orderBy('timestamp')->get();
    }

    public function createPayment(CreatePaymentDTO $data): Payment
    {
        return Payment::query()->create([
            'order_id' => $data->order_id,
            'method' => $data->method->value,
            'amount' => $data->amount,
            'status' => PaymentStatus::PENDING->value,
        ]);
    }

    public function updatePayment(Payment $payment, UpdatePaymentDTO $data): Payment
    {
        $payment->update(array_filter([
            'status' => $data->status?->value,
            'transaction_id' => $data->transactionId,
            'paid_at' => $data->paidAt,
        ], static fn ($value) => $value !== null));

        return $payment;
    }

    public function createEvent(Payment $payment, CreatePaymentEventDTO $data): void
    {
        $payment->events()->create([
            'event_type' => $data->eventType->value,
            'timestamp' => $data->timestamp,
            'payload' => $data->payload,
        ]);
    }

    public function reload(Payment $payment): Payment
    {
        return $payment->refresh()->load('events');
    }
}
