<?php

namespace App\DTOs\Campaigns\Promotion;

use App\DTOs\Campaigns\PromotionItem\PromotionItemInputDTO;
use App\Enums\DiscountTarget;
use App\Enums\DiscountType;
use Carbon\Carbon;
use Spatie\LaravelData\Attributes\DataCollectionOf;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\DataCollection;

class UpdatePromotionDTO extends Data
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $description = null,
        public readonly ?DiscountType $type = null,
        public readonly ?DiscountTarget $target = null,
        public readonly ?Carbon $start_date = null,
        public readonly ?Carbon $end_date = null,
        #[DataCollectionOf(PromotionItemInputDTO::class)]
        public readonly ?DataCollection $items = null,
    ) {
    }

}
