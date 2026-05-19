<?php

namespace App\Services\PaymentService;

use App\Aspects\Transactional;
use App\DTOs\Payment\CreatePaymentDTO;
use App\Enums\PaymentEventType;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\OrderService\OrderServiceInterface;
use App\Services\OutboxService;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentService implements PaymentServiceInterface
{
    public function getPaymentById(string $id): ?Payment
    {
        return Payment::query()->with('events')->find($id);
    }

    public function getPaymentByOrderId(string $orderId): ?Payment
    {
        return Payment::query()->with('events')->where('order_id', $orderId)->first();
    }

    public function getPaymentEvents(string $paymentId)
    {
        return Payment::query()->findOrFail($paymentId)->events()->orderBy('timestamp')->get();
    }

    #[Transactional]
    public function createPayment(CreatePaymentDTO $data): Payment
    {
        $payment = Payment::query()->create([
            'order_id' => $data->order_id,
            'method' => $data->method->value,
            'amount' => $data->amount,
            'status' => PaymentStatus::PENDING->value,
        ]);

        $payment->load('order');
        $this->recordEvent($payment, PaymentEventType::PAYMENT_CREATED, []);

        return $payment->refresh()->load('events');
    }

    #[Transactional]
    public function confirmPayment(string $paymentId, ?string $transactionId): Payment
    {
        return $this->transitionPaymentStatus($paymentId, PaymentStatus::COMPLETED, PaymentEventType::PAYMENT_COMPLETED, [
            'transaction_id' => $transactionId,
            'paid_at' => now(),
        ]);
    }

    #[Transactional]
    public function cancelPayment(string $paymentId, ?string $reason, bool $cascadeToOrder = true): Payment
    {
        return $this->transitionPaymentStatus($paymentId, PaymentStatus::CANCELLED, PaymentEventType::PAYMENT_CANCELLED, [
            'reason' => $reason,
        ], $cascadeToOrder);
    }

    #[Transactional]
    public function failPayment(string $paymentId, ?string $reason, bool $cascadeToOrder = true): Payment
    {
        return $this->transitionPaymentStatus($paymentId, PaymentStatus::FAILED, PaymentEventType::PAYMENT_FAILED, [
            'reason' => $reason,
        ], $cascadeToOrder);
    }

    #[Transactional]
    public function expirePayment(string $paymentId): Payment
    {
        return $this->transitionPaymentStatus($paymentId, PaymentStatus::FAILED, PaymentEventType::PAYMENT_EXPIRED, [
            'reason' => 'PAYMENT_EXPIRED',
            'actor_user_id' => 'payment-expiry',
        ]);
    }

    private function transitionPaymentStatus(string $paymentId, PaymentStatus $status, ?PaymentEventType $eventType, array $payload, bool $cascadeToOrder = true): Payment
    {
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
            app(OrderServiceInterface::class)->confirmOrderAfterPayment($payment->order, $payload['actor_user_id'] ?? 'payment');
        }

        if ($cascadeToOrder && in_array($status, [PaymentStatus::FAILED, PaymentStatus::CANCELLED], true)) {
            app(OrderServiceInterface::class)->cancelOrderByClient(
                $payment->order->user_id,
                $payment->order_id,
                $payload['reason'] ?? $status->value
            );
        }

        return $payment->refresh()->load('events');
    }

    private function assertTransition(PaymentStatus $from, PaymentStatus $to): void
    {
        $allowed = match ($from) {
            PaymentStatus::PENDING => [PaymentStatus::COMPLETED, PaymentStatus::FAILED, PaymentStatus::CANCELLED],
            PaymentStatus::COMPLETED => [PaymentStatus::CANCELLED],
            PaymentStatus::FAILED, PaymentStatus::CANCELLED => [],
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
