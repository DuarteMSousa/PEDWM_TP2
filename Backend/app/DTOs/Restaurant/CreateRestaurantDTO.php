<?php

namespace App\DTOs\Restaurant;

use Spatie\LaravelData\Data;

class CreateRestaurantDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $chain_id,
        public readonly string $opening_hours,
        public readonly string $closing_hours,
        public readonly float $delivery_radius,
    ) {
    }
}
