<?php

namespace App\DTOs\Campaigns\Coupon;

use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Spatie\LaravelData\Data;

class UpdateCouponDTO extends Data
{
    public function __construct(
        public readonly ?string $code = null,
        public readonly ?string $description = null,
        public readonly ?DiscountType $type = null,
        public readonly ?DiscountTarget $target = null,
        public readonly ?string $expiry_date = null,
        public readonly ?float $discount = null,
        public readonly ?string $product_id = null,
        public readonly ?string $category_id = null,
        public readonly ?float $min_order_total = null,
        public readonly ?float $max_discount_amount = null,
        public readonly ?int $max_uses = null,
    ) {
    }

}
