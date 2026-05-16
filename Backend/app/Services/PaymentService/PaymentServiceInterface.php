<?php

namespace App\Services\PaymentService;

use App\DTOs\Payment\CreatePaymentDTO;
use App\Models\Payment;

interface PaymentServiceInterface
{
    public function find(string $id): ?Payment;

    public function forOrder(string $orderId): ?Payment;

    public function events(string $paymentId);

    public function create(CreatePaymentDTO $data): Payment;

    public function confirm(string $paymentId, ?string $transactionId): Payment;

    public function cancel(string $paymentId, ?string $reason): Payment;

    public function fail(string $paymentId, ?string $reason): Payment;

}
