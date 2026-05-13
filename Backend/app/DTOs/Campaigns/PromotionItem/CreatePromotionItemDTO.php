<?php

namespace App\DTOs\Product;

class CreateProductOptionDTO
{
    public function __construct(
        public readonly string $id,
        
    ) {
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'extra_price' => $this->extra_price,
            'default_option' => $this->default_option,
        ];
    }
}
