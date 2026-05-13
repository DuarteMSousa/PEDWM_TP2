<?php

namespace App\DTOs\Restaurant;

use Spatie\LaravelData\Data;

class UpdateRestaurantDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $opening_hours,
        public readonly string $closing_hours,
        public readonly float $delivery_radius,
    ) {}
}
