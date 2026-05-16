<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Data;

class UpdateRestaurantProductDTO extends Data
{
    public function __construct(
        public readonly ?string $restaurant_id = null,
        public readonly ?string $product_id = null,
        public readonly ?float $local_price = null,
        public readonly ?bool $is_available = null,
        public readonly ?int $estimated_preparation_time_min = null,
    ) {}
}
