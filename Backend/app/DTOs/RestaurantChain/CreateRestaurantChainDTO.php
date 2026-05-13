<?php

namespace App\DTOs\RestaurantChain;

use Spatie\LaravelData\Data;

class CreateRestaurantChainDTO extends Data
{

    public function __construct(
        public readonly string $name,
    ) {
    }

}
