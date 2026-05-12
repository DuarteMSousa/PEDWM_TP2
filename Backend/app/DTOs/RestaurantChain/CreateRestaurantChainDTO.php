<?php

namespace App\DTOs\RestaurantChain;
class CreateRestaurantChainDTO
{

    public function __construct(
        public readonly string $name,

    ) {
    }

    public function toArray(): array
    {
        return [
            "name" => $this->name,
        ];
    }
}
