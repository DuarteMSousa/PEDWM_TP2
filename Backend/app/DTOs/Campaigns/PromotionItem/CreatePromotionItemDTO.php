<?php

namespace App\DTOs\Campaigns\PromotionItem;

use App\Enums\PromotionItemParentType;
use Spatie\LaravelData\Data;

class CreatePromotionItemDTO extends Data
{
    public function __construct(
        public readonly PromotionItemParentType $parent_type,
        public readonly string $parent_id,
        public readonly string $item_id,
    ) {
    }
}
