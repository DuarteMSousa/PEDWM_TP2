<?php

namespace App\DTOs\Cart;

use Spatie\LaravelData\Data;

class CartItemOptionDTO extends Data
{
    public function __construct(
        public readonly string $cart_item_id,
        public readonly string $option_id,
    ) {
    }
}
