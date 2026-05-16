<?php

namespace App\DTOs\UserAddress;

use Spatie\LaravelData\Data;

class UpdateUserAddressDTO extends Data
{
    public function __construct(
        public readonly ?string $street = null,
        public readonly ?string $city = null,
        public readonly ?string $postal_code = null,
        public readonly ?string $country = null,
        public readonly ?float $latitude = null,
        public readonly ?float $longitude = null,
        public readonly ?bool $is_default = null,
        public readonly ?string $label = null,
    ) {
    }
}
