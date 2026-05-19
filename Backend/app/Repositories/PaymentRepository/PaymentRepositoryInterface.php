<?php

namespace App\Repositories\PaymentRepository;

use App\DTOs\Payment\CreatePaymentDTO;
use App\DTOs\Payment\CreatePaymentEventDTO;
use App\DTOs\Payment\UpdatePaymentDTO;
use App\Models\Payment;

interface PaymentRepositoryInterface
{
    public function getById(string $id): ?Payment;

    public function getByOrderId(string $orderId): ?Payment;

    public function getByIdOrFail(string $id, bool $lock = false): Payment;

    public function getEvents(string $paymentId);

    public function createPayment(CreatePaymentDTO $data): Payment;

    public function updatePayment(Payment $payment, UpdatePaymentDTO $data): Payment;

    public function createEvent(Payment $payment, CreatePaymentEventDTO $data): void;

    public function reload(Payment $payment): Payment;
}
