<?php

namespace App\DTOs\Campaigns\Coupon;

use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Spatie\LaravelData\Data;

class UpdateCouponDTO extends Data
{
    public function __construct(
        public readonly string $code,
        public readonly string $description,
        public readonly DiscountType $type ,
        public readonly DiscountTarget $target ,
        public readonly string $expiry_date,
        public readonly float $discount = 0,
    ) {
    }

}
