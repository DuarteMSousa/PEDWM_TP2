<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;

class UpdateProductOptionGroupDTO extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly int $min_options,
        public readonly int $max_options,
        #[DataCollectionOf(UpdateProductOptionDTO::class)]
        public readonly DataCollection $options,
        public readonly ?string $id = null,
    ) {
    }
}
