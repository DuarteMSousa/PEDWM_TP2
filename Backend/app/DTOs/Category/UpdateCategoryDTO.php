<?php

namespace App\DTOs\Category;

use Spatie\LaravelData\Data;

class UpdateCategoryDTO extends Data
{

    public function __construct(
        public readonly ?string $name = null,

    ) {
    }

    public function toArray(): array
    {
        return array_filter(parent::toArray(), static fn ($value) => $value !== null);
    }
}
