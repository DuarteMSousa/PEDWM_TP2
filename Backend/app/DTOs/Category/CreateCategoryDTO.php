<?php

namespace App\DTOs\Category;

use Spatie\LaravelData\Data;

class CreateCategoryDTO extends Data
{

    public function __construct(
        public readonly string $name,
        public readonly string $chain_id,
    ) {
    }

}
