<?php

namespace App\DTOs\Campaigns\PromotionItem;

use Spatie\LaravelData\Data;

class PromotionItemInputDTO extends Data
{
    public function __construct(
        public readonly string $item_id,
        public readonly ?string $id = null,
    ) {
    }
}
