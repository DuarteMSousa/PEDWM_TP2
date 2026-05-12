<?php

namespace App\DTOs\RestaurantChain;

class UpdateRestaurantChainDTO
{
    public function __construct(
        public readonly ?string $name = null
    ) {
    }

    public function toArray(): array
    {
        return array_filter([
            'name' => $this->name,
        ], static fn ($value) => $value !== null);
    }
}
