<?php

namespace App\DTOs\Order\OrderAddress;

use Spatie\LaravelData\Data;

class CreateOrderAddressDTO extends Data
{
    public function __construct(
        public readonly string $street,
        public readonly string $city,
        public readonly string $postal_code,
        public readonly string $country,
        public readonly float $latitude,
        public readonly float $longitude,
    ) {
    }
}
