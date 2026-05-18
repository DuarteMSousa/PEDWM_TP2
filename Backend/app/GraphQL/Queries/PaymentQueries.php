<?php

namespace App\GraphQL\Queries;

use App\Services\PaymentService\PaymentServiceInterface;

class PaymentQueries
{
    public function __construct(private PaymentServiceInterface $paymentService)
    {
    }

    public function payment($_, array $args)
    {
        return $this->paymentService->getPaymentById($args['id']);
    }

    public function orderPayment($_, array $args)
    {
        return $this->paymentService->getPaymentByOrderId($args['order_id']);
    }

    public function paymentEvents($_, array $args)
    {
        return $this->paymentService->getPaymentEvents($args['payment_id']);
    }
}
