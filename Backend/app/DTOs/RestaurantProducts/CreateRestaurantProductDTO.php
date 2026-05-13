<?php

namespace App\DTOs\Product;

use App\DTOs\Product\ProductOptionGroup\CreateProductOptionGroupDTO;
use Spatie\LaravelData\DataCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;

class CreateRestaurantProductDTO extends Data
{

    public function __construct(
        public readonly string $restaurant_id,
        public readonly string $product_id,
        public readonly float $local_price,
        public readonly bool $isAvailable,
        public readonly int $estimated_preparation_time_min,
    ) {}
}
