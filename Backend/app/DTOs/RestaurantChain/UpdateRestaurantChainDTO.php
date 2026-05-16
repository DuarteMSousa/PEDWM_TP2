<?php

namespace App\DTOs\RestaurantChain;

use Spatie\LaravelData\Data;

class UpdateRestaurantChainDTO extends Data
{
    public function __construct(
        public readonly ?string $name = null
    ) {
    }

}
