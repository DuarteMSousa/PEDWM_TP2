<?php

namespace App\DTOs\Campaigns\Coupon;

use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use App\DTOs\Campaigns\PromotionItem\PromotionItemInputDTO;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;

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
        #[DataCollectionOf(PromotionItemInputDTO::class)]
        public readonly ?DataCollection $items = null,
    ) {}

}
