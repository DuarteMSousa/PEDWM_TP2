<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;

class CreateProductOptionGroupDTO
{

    public function __construct(
        public readonly string $name,
        public readonly int $min_options,
        public readonly int $max_options,
        #[DataCollectionOf(CreateProductOptionDTO::class)]
        public readonly DataCollection $options,
    ) {}

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'min_options' => $this->min_options,
            'max_options' => $this->max_options,
        ];
    }
}
