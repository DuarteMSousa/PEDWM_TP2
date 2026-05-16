<?php

namespace App\DTOs\Payment;

use App\Enums\PaymentMethod;
use Spatie\LaravelData\Data;

class CreatePaymentDTO extends Data
{
    public function __construct(
        public readonly string $order_id,
        public readonly PaymentMethod $method,
        public readonly float $amount,
    ) {
    }
}
