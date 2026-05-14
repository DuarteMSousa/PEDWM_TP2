<?php

namespace App\DTOs\Cart;

use Spatie\LaravelData\Data;

class UpdateCartItemDTO extends Data
{
    public function __construct(
        public readonly string $cart_id,
        public readonly string $restaurant_product_id,
        public readonly int $quantity,
    ) {
    }
}
