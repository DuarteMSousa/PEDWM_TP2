<?php

namespace App\DTOs\Order\OrderItemOption;

use Spatie\LaravelData\Data;

class CreateOrderItemOptionDTO extends Data
{
    public function __construct(
        public readonly string $product_option_id,
        public readonly string $option_name_snapshot,
        public readonly float $extra_price = 0,
    ) {
    }
}
