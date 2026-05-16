<?php

namespace App\DTOs\Cart;

use Spatie\LaravelData\Data;

class AddCartItemDTO extends Data
{

    public function __construct(
        public readonly string $restaurant_product_id,
        public readonly int $quantity,
        public readonly array $option_ids = [],
    ) {
    }

}
