<?php

namespace App\DTOs\Product;

use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;


class UpdateProductDTO extends Data
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?float $price = null,
        public readonly ?string $description = null,
        #[DataCollectionOf(UpdateProductOptionGroupDTO::class)]
        public readonly ?DataCollection $option_groups = null,
    ) {
    }

}
