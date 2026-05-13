<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;


class UpdateRestaurantProductDTO extends Data
{
    public function __construct(
        public readonly float $local_price,
        public readonly bool $isAvailable,
        public readonly int $estimated_preparation_time_min,
    ) {}
}
