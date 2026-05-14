<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Data;

class UpdateProductOptionDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly float $extra_price,
        public readonly bool $default_option = false,
        public readonly ?string $id = null,
    ) {
    }
}
