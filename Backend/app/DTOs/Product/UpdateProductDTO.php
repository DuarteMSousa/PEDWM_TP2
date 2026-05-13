<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\DataCollection;


class UpdateProductDTO
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?float $price = null,
        public readonly ?string $description = null,
        #[DataCollectionOf(UpdateProductOptionGroupDTO::class)]
        public readonly ?DataCollection $option_groups = null,
    ) {
    }

    public function toArray(): array
    {
        return array_filter([
            'name' => $this->name,
            'price' => $this->price,
            'description' => $this->description,
        ], static fn ($value) => $value !== null);
    }
}
