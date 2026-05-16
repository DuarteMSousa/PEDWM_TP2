<?php

namespace App\DTOs\UserAddress;

use Spatie\LaravelData\Data;

class CreateUserAddressDTO extends Data
{
    public function __construct(
        public readonly string $street,
        public readonly string $city,
        public readonly string $postal_code,
        public readonly string $country,
        public readonly float $latitude,
        public readonly float $longitude,
        public readonly bool $is_default = false,
        public readonly ?string $label = null,
    ) {
    }
}
