<?php

namespace App\DTOs\Campaigns\Promotion;

use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Spatie\LaravelData\Data;

class CreateProductDTO extends Data
{
    public function __construct(
        public readonly string $chain_id,
        public readonly string $name,
        public readonly ?string $description,
        public readonly DiscountType $type,
        public readonly DiscountTarget $target,
        public readonly string $start_date,
        public readonly string $end_date,
    ) {
    }

    public function toArray(): array
    {
        return [
            'chain_id' => $this->chain_id,
            'name' => $this->name,
            'description' => $this->description,
            'type' => $this->type->value,
            'target' => $this->target->value,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
        ];
    }
}
