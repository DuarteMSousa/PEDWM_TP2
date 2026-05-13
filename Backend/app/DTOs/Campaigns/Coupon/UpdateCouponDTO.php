<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;


class UpdateProductDTO
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?float $price = null,
        public readonly ?string $description = null,
        #[DataCollectionOf(CreateProductOptionGroupDTO::class)]
        public readonly DataCollection $option_groups,
    ) {
    }

    public function toArray(): array
    {
        return array_filter([
            'name' => $this->name,
            'price' => $this->price,
            'description' => $this->description,
        ], fn($value) => $value !== null);
    }
}
