<?php

namespace App\DTOs\Restaurant;

use Spatie\LaravelData\Data;

class UpdateRestaurantDTO extends Data
{
    public function __construct(
        public readonly ?string $chain_id = null,
        public readonly ?string $name = null,
        public readonly ?string $opening_hours = null,
        public readonly ?string $closing_hours = null,
        public readonly ?float $delivery_radius = null,
        public readonly ?string $street = null,
        public readonly ?string $city = null,
        public readonly ?string $postal_code = null,
        public readonly ?string $country = null,
        public readonly ?float $latitude = null,
        public readonly ?float $longitude = null,
    ) {}
}
