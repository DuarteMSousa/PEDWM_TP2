<?php

namespace App\DTOs\Campaigns\PromotionItem;

use Spatie\LaravelData\Data;

class CreatePromotionItemDTO extends Data
{
    public function __construct(
        public readonly string $promotion_id,
        public readonly string $target_id,
        public readonly float $discount,
    ) {
    }
}
