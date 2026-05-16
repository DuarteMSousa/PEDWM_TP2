<?php

namespace App\DTOs\Cart;

use Spatie\LaravelData\Data;

class UpdateCartItemDTO extends Data
{
    public function __construct(
        public readonly int $quantity,
        public readonly ?array $option_ids = null,
    ) {
    }
}
