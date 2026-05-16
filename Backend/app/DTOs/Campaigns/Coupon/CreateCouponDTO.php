<?php

namespace App\DTOs\Campaigns\Coupon;

use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Spatie\LaravelData\Data;

class CreateCouponDTO extends Data
{
    public function __construct(
        public readonly string $chain_id,
        public readonly string $code,
        public readonly ?string $description,
        public readonly DiscountType $type,
        public readonly DiscountTarget $target,
        public readonly ?string $expiry_date,
        public readonly float $discount = 0,
        public readonly ?string $product_id = null,
        public readonly ?string $category_id = null,
        public readonly ?float $min_order_total = null,
        public readonly ?float $max_discount_amount = null,
        public readonly ?int $max_uses = null,
    ) {}

}
