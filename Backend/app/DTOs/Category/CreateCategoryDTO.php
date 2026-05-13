<?php

namespace App\DTOs\Category;
class CreateCategoryDTO
{

    public function __construct(
        public readonly string $name,
        public readonly string $chain_id,
    ) {
    }

    public function toArray(): array
    {
        return [
            "name" => $this->name,
            "chain_id" => $this->chain_id,
        ];
    }
}
