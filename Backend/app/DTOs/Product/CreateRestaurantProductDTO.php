<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Data;

class CreateRestaurantProductDTO extends Data
{

    public function __construct(
        public readonly string $restaurant_id,
        public readonly string $product_id,
        public readonly ?float $local_price = null,
        public readonly bool $is_available = true,
        public readonly ?int $estimated_preparation_time_min = null,
    ) {}
}
