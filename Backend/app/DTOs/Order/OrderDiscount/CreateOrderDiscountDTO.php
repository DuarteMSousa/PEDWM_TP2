<?php

namespace App\DTOs\Order\OrderDiscount;

use App\Enums\CampaignMorphType;
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
        public readonly CampaignMorphType $origin_type,
        public readonly string $origin_id,
    ) {}
}
