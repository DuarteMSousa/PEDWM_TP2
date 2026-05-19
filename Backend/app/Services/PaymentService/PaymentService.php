<?php

namespace App\Services\PaymentService;

use App\Aspects\Transactional;
use App\Domain\StateMachines\Payments\PaymentStateFactory;
use App\DTOs\Payment\CreatePaymentDTO;
use App\DTOs\Payment\CreatePaymentEventDTO;
use App\DTOs\Payment\UpdatePaymentDTO;
use App\Enums\PaymentEventType;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Repositories\PaymentRepository\PaymentRepositoryInterface;
use App\Services\OrderService\OrderServiceInterface;
use App\Services\OutboxService;
use Illuminate\Support\Str;

class PaymentService implements PaymentServiceInterface
{
    public function __construct(private PaymentRepositoryInterface $payments) {}

    public function getPaymentById(string $id): ?Payment
    {
        return $this->payments->getById($id);
    }

    public function getPaymentByOrderId(string $orderId): ?Payment
    {
        return $this->payments->getByOrderId($orderId);
    }

    public function getPaymentEvents(string $paymentId)
    {
        return $this->payments->getEvents($paymentId);
    }

    #[Transactional]
    public function createPayment(CreatePaymentDTO $data): Payment
    {
        $payment = $this->payments->createPayment($data);

        $payment->load('order');
        $this->recordEvent($payment, PaymentEventType::PAYMENT_CREATED, []);

        return $this->payments->reload($payment);
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
        $payment = $this->payments->getByIdOrFail($paymentId, lock: true);
        $payment->load('order');
        PaymentStateFactory::from($payment->status)->transition($payment, $status, [
            'transaction_id' => $payload['transaction_id'] ?? $payment->transaction_id,
            'paid_at' => $payload['paid_at'] ?? $payment->paid_at,
        ]);
        $this->payments->updatePayment($payment, new UpdatePaymentDTO(
            status: $status,
            transactionId: $payload['transaction_id'] ?? $payment->transaction_id,
            paidAt: $payload['paid_at'] ?? $payment->paid_at,
        ));

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

        return $this->payments->reload($payment);
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

        $this->payments->createEvent($payment, new CreatePaymentEventDTO(
            eventType: $eventType,
            timestamp: $occurredAt,
            payload: $eventPayload,
        ));

        app(OutboxService::class)->enqueue('payment', $payment->id, $eventType->value, $eventPayload);
    }
}
