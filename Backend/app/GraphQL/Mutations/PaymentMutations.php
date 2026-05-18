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
        return $this->paymentService->createPayment(CreatePaymentDTO::from($args['input']));
    }

    public function confirmPayment($_, array $args)
    {
        return $this->paymentService->confirmPayment($args['payment_id'], $args['transaction_id'] ?? null);
    }

    public function payPayment($_, array $args)
    {
        return $this->paymentService->confirmPayment($args['payment_id'], $args['transaction_id'] ?? null);
    }

    public function cancelPayment($_, array $args)
    {
        return $this->paymentService->cancelPayment($args['payment_id'], $args['reason'] ?? null);
    }

    public function failPayment($_, array $args)
    {
        return $this->paymentService->failPayment($args['payment_id'], $args['reason'] ?? null);
    }
}
