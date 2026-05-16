<?php

namespace App\DTOs\Campaigns\PromotionItem;

use Spatie\LaravelData\Data;

class PromotionItemInputDTO extends Data
{
    public function __construct(
        public readonly float $discount,
        public readonly ?string $id = null,
        public readonly ?string $product_id = null,
        public readonly ?string $category_id = null,
    ) {
    }
}
