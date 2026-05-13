<?php

namespace App\DTOs\Product;

class UpdateProductOptionDTO
{
    public function __construct(
        public readonly ?string $id = null,
        public readonly string $name,
        public readonly float $extra_price,
        public readonly bool $default_option = false,
    ) {
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'extra_price' => $this->extra_price,
            'default_option' => $this->default_option,
        ];
    }
}