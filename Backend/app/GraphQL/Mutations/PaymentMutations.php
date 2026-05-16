<?php

namespace App\GraphQL\Mutations;

use App\DTOs\Payment\CreatePaymentDTO;
use App\Services\PaymentService\PaymentServiceInterface;

class PaymentMutations
{
    public function __construct(private PaymentServiceInterface $paymentService)
    {
    }

    public function createPayment($_, array $args)
    {
        return $this->paymentService->create(CreatePaymentDTO::from($args['input']));
    }

    public function confirmPayment($_, array $args)
    {
        return $this->paymentService->confirm($args['payment_id'], $args['transaction_id'] ?? null);
    }

    public function payPayment($_, array $args)
    {
        return $this->paymentService->confirm($args['payment_id'], $args['transaction_id'] ?? null);
    }

    public function cancelPayment($_, array $args)
    {
        return $this->paymentService->cancel($args['payment_id'], $args['reason'] ?? null);
    }

    public function failPayment($_, array $args)
    {
        return $this->paymentService->fail($args['payment_id'], $args['reason'] ?? null);
    }

    public function refundPayment($_, array $args)
    {
        return $this->paymentService->refund($args['payment_id'], $args['reason'] ?? null);
    }
}
