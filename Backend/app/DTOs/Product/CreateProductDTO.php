<?php

namespace App\DTOs\Product;

use App\DTOs\Product\ProductOptionGroup\CreateProductOptionGroupDTO;
use Spatie\LaravelData\DataCollection;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;

class CreateProductDTO extends Data
{

    public function __construct(
        public readonly string $category_id,
        public readonly string $name,
        public readonly float $price,
        public readonly ?string $description,
        #[DataCollectionOf(CreateProductOptionGroupDTO::class)]
        public readonly DataCollection $option_groups,
    ) {
    }

}
