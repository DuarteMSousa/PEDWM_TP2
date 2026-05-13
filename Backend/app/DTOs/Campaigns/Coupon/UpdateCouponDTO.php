<?php

namespace App\DTOs\Campaigns\Coupon;

use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Spatie\LaravelData\Data;

class UpdateCouponDTO extends Data
{
    public function __construct(
        public readonly ?string $chain_id = null,
        public readonly ?string $code = null,
        public readonly ?string $description = null,
        public readonly ?DiscountType $type = null,
        public readonly ?DiscountTarget $target = null,
        public readonly ?string $expiry_date = null,
    ) {
    }

    public function toArray(): array
    {
        return array_filter([
            'chain_id' => $this->chain_id,
            'code' => $this->code,
            'description' => $this->description,
            'type' => $this->type?->value,
            'target' => $this->target?->value,
            'expiry_date' => $this->expiry_date,
        ], static fn ($value) => $value !== null);
    }
}
