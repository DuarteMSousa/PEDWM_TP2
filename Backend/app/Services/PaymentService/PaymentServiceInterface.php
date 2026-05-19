<?php

namespace App\Services\PaymentService;

use App\DTOs\Payment\CreatePaymentDTO;
use App\Models\Payment;

interface PaymentServiceInterface
{
    public function getPaymentById(string $id): ?Payment;

    public function getPaymentByOrderId(string $orderId): ?Payment;

    public function getPaymentEvents(string $paymentId);

    public function createPayment(CreatePaymentDTO $data): Payment;

    public function confirmPayment(string $paymentId, ?string $transactionId): Payment;

    public function cancelPayment(string $paymentId, ?string $reason, bool $cascadeToOrder = true): Payment;

    public function failPayment(string $paymentId, ?string $reason, bool $cascadeToOrder = true): Payment;

    public function expirePayment(string $paymentId): Payment;
}
