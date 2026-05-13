<?php

namespace App\DTOs\Restaurant;

use Spatie\LaravelData\Data;

class UpdateRestaurantDTO extends Data
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $opening_hours = null,
        public readonly ?string $closing_hours = null,
        public readonly ?float $delivery_radius = null,
    ) {
    }

    public function toArray(): array
    {
        return array_filter(parent::toArray(), static fn ($value) => $value !== null);
    }
}
