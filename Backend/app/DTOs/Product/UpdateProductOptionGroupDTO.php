<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\DataCollection;

class UpdateProductOptionGroupDTO
{
    public function __construct(
        public readonly ?string $id = null,
        public readonly string $name,
        public readonly int $min_options,
        public readonly int $max_options,
        #[DataCollectionOf(UpdateProductOptionDTO::class)]
        public readonly DataCollection $options,
    ) {
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'min_options' => $this->min_options,
            'max_options' => $this->max_options,
        ];
    }
}