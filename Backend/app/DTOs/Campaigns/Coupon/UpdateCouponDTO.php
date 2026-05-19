<?php

namespace App\DTOs\Campaigns\Coupon;

use App\DTOs\Campaigns\PromotionItem\PromotionItemInputDTO;
use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;

class UpdateCouponDTO extends Data
{
    public function __construct(
        public readonly ?string $code = null,
        public readonly ?string $description = null,
        public readonly ?DiscountType $type = null,
        public readonly ?DiscountTarget $target = null,
        public readonly ?string $expiry_date = null,
        public readonly ?float $discount = null,
        #[DataCollectionOf(PromotionItemInputDTO::class)]
        public readonly ?DataCollection $items = null,
    ) {
    }

}
