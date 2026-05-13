<?php

namespace App\DTOs\Restaurant;

class UpdateRestaurantDTO
{
    public function __construct(
        public readonly string $name,
        public readonly string $openingHours,
        public readonly string $closingHours,
        public readonly float $deliveryRadius,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            name: trim((string) ($data['name'] ?? '')),
            openingHours: trim((string) ($data['opening_hours'] ?? '')),
            closingHours: trim((string) ($data['closing_hours'] ?? '')),
            deliveryRadius: (float) ($data['delivery_radius'] ?? 0),
        );
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'opening_hours' => $this->openingHours,
            'closing_hours' => $this->closingHours,
            'delivery_radius' => $this->deliveryRadius,
        ];
    }

}