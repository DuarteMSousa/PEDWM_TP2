<?php

namespace App\DTOs\Product\ProductOptionGroup;

use App\DTOs\Product\ProductOption\CreateProductOptionDTO;
use Spatie\LaravelData\DataCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;

class CreateProductOptionGroupDTO extends Data
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
