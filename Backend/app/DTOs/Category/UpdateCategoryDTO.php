<?php

namespace App\DTOs\Category;

use Spatie\LaravelData\Data;

class UpdateCategoryDTO extends Data
{

    public function __construct(
        public readonly ?string $name = null,

    ) {
    }
}
