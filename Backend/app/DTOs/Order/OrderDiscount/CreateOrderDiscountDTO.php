<?php

namespace App\DTOs\Order\OrderDiscount;

use App\Enums\DiscountOriginType;
use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Spatie\LaravelData\Data;

class CreateOrderDiscountDTO extends Data
{
    public function __construct(
        public readonly string $name_snapshot,
        public readonly ?string $description_snapshot,
        public readonly float $discount_amount,
        public readonly DiscountType $discount_type,
        public readonly DiscountTarget $discount_target,
        public readonly ?string $order_item_id,
        public readonly DiscountOriginType $origin_type,
        public readonly string $origin_id,
    ) {
    }

    public function toArray(): array
    {
        return [
            'name_snapshot' => $this->name_snapshot,
            'description_snapshot' => $this->description_snapshot,
            'discount_amount' => $this->discount_amount,
            'discount_type' => $this->discount_type->value,
            'discount_target' => $this->discount_target->value,
            'order_item_id' => $this->order_item_id,
            'origin_type' => $this->origin_type->value,
            'origin_id' => $this->origin_id,
        ];
    }
}
