<?php

namespace App\DTOs\Product\ProductOption;

use Spatie\LaravelData\Data;

class CreateProductOptionDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly float $extra_price,
        public readonly bool $default_option = false,
    ) {
    }

}
