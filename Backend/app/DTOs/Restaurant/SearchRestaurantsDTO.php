<?php

namespace App\DTOs\Restaurant;

use Spatie\LaravelData\Data;

class SearchRestaurantsDTO extends Data
{
    public function __construct(
        public readonly string $q = '',
        public readonly string $name = '',
        public readonly string $chainName = '',
        public readonly string $city = '',
        public readonly string $country = '',
        public readonly string $postalCode = '',
        public readonly int $pageNumber = 1,
        public readonly int $pageSize = 20,
    ) {
    }
}
