<?php

namespace App\DTOs\Order;

use App\Enums\PaymentMethod;
use Spatie\LaravelData\Data;

class CheckoutDTO extends Data
{
    public function __construct(
        public readonly PaymentMethod $payment_method,
        public readonly ?string $cart_id = null,
        public readonly ?string $address_id = null,
    ) {
    }
}
