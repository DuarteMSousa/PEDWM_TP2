<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;

class CreateProductDTO
{

    public function __construct(
        public readonly string $category_id,
        public readonly string $name,
        public readonly float $price,
        public readonly ?string $description = null,
        #[DataCollectionOf(CreateProductOptionGroupDTO::class)]
        public readonly DataCollection $option_groups,
    ) {
    }

    public function toArray(): array
    {
        return [
            'category_id' => $this->category_id,
            'name' => $this->name,
            'price' => $this->price,
            'description' => $this->description,
        ];
    }
}
