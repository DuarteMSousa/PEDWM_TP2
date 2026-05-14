<?php

namespace App\DTOs\Campaigns\PromotionItem;

use Spatie\LaravelData\Data;

class CreatePromotionItemDTO extends Data
{
    public function __construct(
        public readonly string $promotion_id,
        public readonly float $discount,
        public readonly ?string $product_id = null,
        public readonly ?string $category_id = null,
    ) {
    }
}
