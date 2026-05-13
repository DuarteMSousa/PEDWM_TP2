<?php

namespace App\DTOs\Category;
class UpdateCategoryDTO
{

    public function __construct(
        public readonly string $name,

    ) {
    }

    public function toArray(): array
    {
        return [
            "name" => $this->name,
        ];
    }
}
