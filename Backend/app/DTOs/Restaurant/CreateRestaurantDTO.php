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
        public readonly ?string $street = null,
        public readonly ?string $city = null,
        public readonly ?string $postal_code = null,
        public readonly ?string $country = null,
        public readonly ?float $latitude = null,
        public readonly ?float $longitude = null,
    ) {
    }
}
