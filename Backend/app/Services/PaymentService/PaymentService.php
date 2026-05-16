<?php

namespace App\Services\PaymentService;

use App\DTOs\Payment\CreatePaymentDTO;
use App\Enums\PaymentEventType;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\OrderService\OrderServiceInterface;
use App\Services\OutboxService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
        return DB::transaction(function () use ($data): Payment {
            $payment = Payment::query()->create([
                'order_id' => $data->order_id,
                'method' => $data->method->value,
                'amount' => $data->amount,
                'status' => PaymentStatus::PENDING->value,
            ]);

            $payment->load('order');
            $this->recordEvent($payment, PaymentEventType::PAYMENT_CREATED, []);

            return $payment->refresh()->load('events');
        });
    }

    public function confirm(string $paymentId, ?string $transactionId): Payment
    {
        return $this->setStatus($paymentId, PaymentStatus::COMPLETED, PaymentEventType::PAYMENT_COMPLETED, [
            'transaction_id' => $transactionId,
            'paid_at' => now(),
        ]);
    }

    public function cancel(string $paymentId, ?string $reason): Payment
    {
        return $this->setStatus($paymentId, PaymentStatus::CANCELLED, PaymentEventType::PAYMENT_CANCELLED, [
            'reason' => $reason,
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
            $payment = Payment::query()->with('order')->lockForUpdate()->findOrFail($paymentId);
            $this->assertTransition($payment->status, $status);
            $payment->fill([
                'status' => $status->value,
                'transaction_id' => $payload['transaction_id'] ?? $payment->transaction_id,
                'paid_at' => $payload['paid_at'] ?? $payment->paid_at,
            ]);
            $payment->save();

            if ($eventType) {
                $this->recordEvent($payment, $eventType, $payload);
            }

            if ($status === PaymentStatus::COMPLETED) {
                app(OrderServiceInterface::class)->confirmAfterPayment($payment->order, $payload['actor_user_id'] ?? 'payment');
            }

            if (in_array($status, [PaymentStatus::FAILED, PaymentStatus::CANCELLED], true)) {
                app(OrderServiceInterface::class)->cancelByClient(
                    $payment->order->user_id,
                    $payment->order_id,
                    $payload['reason'] ?? $status->value
                );
            }

            return $payment->refresh()->load('events');
        });
    }

    private function assertTransition(PaymentStatus $from, PaymentStatus $to): void
    {
        $allowed = match ($from) {
            PaymentStatus::PENDING => [PaymentStatus::COMPLETED, PaymentStatus::FAILED, PaymentStatus::CANCELLED],
            PaymentStatus::COMPLETED => [PaymentStatus::REFUNDED],
            PaymentStatus::FAILED, PaymentStatus::REFUNDED, PaymentStatus::CANCELLED => [],
        };

        if (! in_array($to, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => "Invalid payment transition from {$from->value} to {$to->value}.",
            ]);
        }
    }

    private function recordEvent(Payment $payment, PaymentEventType $eventType, array $payload): void
    {
        $occurredAt = now();
        $eventPayload = [
            'eventId' => (string) Str::uuid(),
            'eventName' => $eventType->value,
            'aggregateType' => 'payment',
            'aggregateId' => $payment->id,
            'paymentId' => $payment->id,
            'orderId' => $payment->order_id,
            'actorId' => $payload['actor_user_id'] ?? null,
            'occurredAt' => $occurredAt->toIso8601String(),
            'data' => $payload,
            'channels' => [
                "customer.{$payment->order->user_id}.orders",
                "restaurant.{$payment->order->restaurant_id}.orders",
            ],
        ];

        $payment->events()->create([
            'event_type' => $eventType->value,
            'timestamp' => $occurredAt,
            'payload' => $eventPayload,
        ]);

        app(OutboxService::class)->enqueue('payment', $payment->id, $eventType->value, $eventPayload);
    }
}
